"""Build full-book content from page specifications plus explicit editorial mappings.
Unknown exercise numbers fail the build; originals remain available separately.
"""
import json,re,ast,operator,sys
from pathlib import Path
from overrides import OV,FRAMES,FORMULAS
from question_tasks import QUESTION_FIELDS
ROOT=Path(__file__).resolve().parents[2]
source=json.loads((ROOT/'scripts/content/source_blocks.json').read_text())
assets=json.loads((ROOT/'textbook/data/assets.json').read_text())
OPS={ast.Add:operator.add,ast.Sub:operator.sub,ast.Mult:operator.mul,ast.Div:operator.truediv}
def calc(s):
 s=s.translate(str.maketrans({'−':'-','×':'*','·':'*','∙':'*',':':'/','÷':'/'}))
 def go(n):
  if isinstance(n,ast.Constant) and type(n.value)==int:return n.value
  if isinstance(n,ast.BinOp) and type(n.op) in OPS:return OPS[type(n.op)](go(n.left),go(n.right))
  raise ValueError(s)
 v=go(ast.parse(s,mode='eval').body)
 if int(v)!=v:raise ValueError(s)
 return int(v)
EXPR=r'\d+(?:[ \t]*[+−\-×·∙:÷*][ \t]*\d+)+'
def exprs(s):
 s=re.sub(r'(?:[Сс]трока|[Сс]толбик|[Кк]олонка|[Сс]толбец|[Рр]яд)\s*\d+\s*:', '', s)
 return [m.group() for m in re.finditer(EXPR,s) if not re.match(r'[ \t]*=[ \t]*\d',s[m.end():])]
def stripunits(s):return re.sub(r'(?<=\d)\s*(?:руб\.?|коп\.?|кг|см|м|л)(?=\s*[+−\-×·∙:÷*=])','',s)
def pairs(s):
 out=[]
 for m in re.finditer('('+EXPR+r')\s*=\s*(\d+)',stripunits(s)):
  try:
   if calc(m[1])==int(m[2]) and (m[1],int(m[2])) not in out:out.append((m[1],int(m[2])))
  except (ValueError,SyntaxError,ZeroDivisionError):pass
 return out

def fields(p):return [{'id':f'q{i+1}','label':str(label),'expected':str(v)} for i,(label,v) in enumerate(p)]
OPNAMES={'+':'сложение','−':'вычитание','-':'вычитание','×':'умножение','·':'умножение','∙':'умножение',':':'деление','÷':'деление'}
def examplesHeading(t):
 kinds={OPNAMES[c] for c in re.findall(r'[+−\-×·∙:÷]',t) if c in OPNAMES}
 return f'Примеры на {next(iter(kinds))}' if len(kinds)==1 else 'Примеры'
ACTIVITY_HEADINGS={'sequence':'Считай по порядку','coins':'Монеты','composition':'Состав числа','ruler':'Измерь','place':'Где что стоит','balance':'Весы','liquid':'Мерки','groups':'Разложи поровну','count':'Сосчитай'}
def heading(b,data):
 # Testers could not tell what a step asks from a bare «№ 241»; the number now lives in the step header,
 # and the heading names the kind of work: from the spec's role when it has one, else from the built task.
 role=b['role'].lower();t=b['text'];kind=data.get('kind')
 if role.startswith('задача'):return 'Задача'
 if kind=='work' and role.startswith(('инструкция','образец','правило','пояснение','таблица','счётн')) and data['fields'] and all(re.search('[=□]',f['label']) for f in data['fields']):return examplesHeading(' '.join(f['label'] for f in data['fields']))
 if role.startswith('пример'):return examplesHeading(t)
 if role.startswith(('упражнение','задание')):return 'Упражнение'
 if role.startswith('практическ'):return 'Практическое задание'
 # «Рассмотри» heads something to read; a sample with answer fields is named by its work.
 if role.startswith(('инструкция','образец','правило','пояснение')) and kind=='read':return 'Рассмотри'
 if role.startswith('таблица'):return 'Таблица'
 if role.startswith('игра'):return 'Игра'
 if role.startswith('счётн'):return 'Счёт'
 if kind=='story':return 'Задача'
 if kind=='compose':return 'Составь задачу' if data.get('story') else 'Составь примеры'
 if kind=='recipe':return 'Своя задача'
 if kind=='practical':return 'Практическое задание'
 if kind=='activity':return ACTIVITY_HEADINGS.get(data['activity'].get('mode'),'Упражнение')
 if kind=='relation':return 'Нарисуй'
 if kind=='numberGame':return 'Игра с числами'
 if kind=='targetGame':return 'Игра'
 if kind=='read':return 'Рассмотри'
 if kind=='work':
  if bareExamples(t):return examplesHeading(t)
  if '?' in t:return 'Задача'
 return 'Упражнение'
def bareExamples(t):return not re.search('[А-Яа-яёЁ]{3}',re.sub(r'(?:[Сс]трока|[Сс]толбик|[Кк]олонка|[Сс]толбец|[Рр]яд|[Рр]амка)\s*\d*\s*:','',t))
def work(p):return {'kind':'work','fields':fields(p)}
def act(mode,targets,**kw):return {'kind':'activity','activity':dict(mode=mode,targets=targets,**kw)}
def rule(op='+',left=None,right=None,result=None,max=20):return {k:v for k,v in dict(operator=op,left=left,right=right,result=result,max=max).items() if v is not None}
def compose(rules,story=False):return dict(kind='compose',rules=rules,story=story)
def clean(t):
 t=t.replace('«','').replace('»','');t=re.sub(r'^\s*\d{1,3}\.\s*','',t)
 t=re.sub(r'^\s*[-`]{3,}\s*$','',t,flags=re.M)
 return t.strip()
def blanks(t):
 # Solve each printed missing addend independently, including a missing first addend.
 out=[]
 pattern=r'(\d+|…|\.{2,}|□)\s*([+−\-×:])\s*(\d+|…|\.{2,}|□)\s*=\s*(\d+)'
 for m in re.finditer(pattern,t):
  a,op,b,z=m.groups();z=int(z)
  if a.isdigit() and b.isdigit():continue
  found=[]
  for v in range(101):
   try:
    if calc(f'{a if a.isdigit() else v}{op}{b if b.isdigit() else v}')==z:found.append(v)
   except (ValueError,SyntaxError,ZeroDivisionError):pass
  if len(found)==1:out.append((re.sub(r'…|\.{2,}|□','□',m.group()),found[0]))
 return out
# Explicit arithmetic frames.
for n,es in FRAMES.items():OV[n]=work([(e+' =',calc(e)) for e in es])
# Hand-authored open tasks whose numbers are chosen by the child.
for n,op,left,right,maxval in [(191,'+',2,None,10),(192,'+',6,None,10),(193,'+',None,None,10),(243,'+',11,None,20),(448,'−',None,8,20),(605,'×',2,None,20),(606,'×',None,3,20),(890,'×',None,3,100)]:OV[n]=compose([rule(op,left,right,max=maxval)],True)
for n,ts in {297:[2],298:[4],352:[-1],353:[-3]}.items():OV[n]={'kind':'relation','difference':ts[0]}
for n,formula in FORMULAS.items():OV[n]=dict(kind='recipe',formula=formula,max=100 if n>=721 else 20)
OV[598]=compose([rule('×',9,2),rule('+',18,2)],True)
OV[680]=compose([rule('−',16,4),rule(':',12,2)],True)
OV[702]=compose([rule('+',11,3),rule(':',14,7)],True)
OV[360]=compose([rule('+',2,3,max=10),rule('−',10,5,max=10)],True)
OV[331]=work([('Какое число на второй карточке?',7)])
OV[331]['prompt']='На одной карточке написано 10. На другой — число на 3 меньше. Найди его.'
OV[489]=work([('Сколько всего кусков пластилина в двух коробках?',14),('Сколько кусков осталось?',1)])
OV[489]['prompt']='В одной коробке было 7 кусков пластилина, в другой — столько же. Детям выдали 13 кусков. Сколько осталось?'
OV[737]['activity']['board']='pages'
OV[739]['activity']['board']='hundred'
for n in [171,172,173,750,751,753]: OV[n]['activity']['measure']=True
OV[750]['prompt']='Измерь отрезок учебной линейкой. Масштаб виртуальный; размер оригинала по скану точно не установлен.'
OV[642]=work([(e+' =',calc(e)) for e in ['9:3','12:3','6:3','15:3','18:3','9:3','6:2','6:3','12:2','12:3','18:2','15:3','14:2','9:3']])
OV[678]=work([(e+' =',calc(e)) for e in ['10:5','20:5','5:5','15:5','10:2','20:2','6:2','10:5','20:4','3:3','15:3','20:5','12:2','15:5','5:5','9:3']])
# These illustrations specify the exact prices/quantities.
OV[149]=compose([rule('+',3,7,max=10)],True)
OV[541]=compose([rule('×',2,5),rule('×',3,4)],True)
OV[591]=compose([rule('×',6,None),rule('×',4,None),rule('×',3,None)],True)
# Drawing plans are attached in TypeScript so they share the same geometry engine.
numWords={'двух':2,'двa':2,'два':2,'трёх':3,'трех':3,'три':3,'трёх':3,'четырёх':4,'четырех':4,'четыре':4,'пяти':5,'пять':5,'шести':6,'шесть':6,'семи':7,'семь':7,'восьми':8,'восемь':8}
def creative(b,p):
 t=clean(b['text']);sol=b['solution'];n=b['number'];maxval=10 if p<59 else 20 if p<126 else 100
 if re.search('карточек разрезной таблицы',t):
  count=4 if re.search(r'четыре|4 пример',t) else 3 if re.search('три',t) else 2
  amounts=re.findall(r'(?:прибавление|вычитание)\s+(\d+|[а-яё]+)',t)
  nums=[int(v) if v.isdigit() else numWords.get(v,0) for v in amounts]
  if not all(nums):return None
  operators=['+' if x=='прибавление' else '−' for x in re.findall('прибавление|вычитание',t)]
  return compose([rule(op,right=k,max=maxval) for op,k in zip(operators,nums) for _ in range(count)])
 if re.search('Составьте (?:несколько )?примеры|Составьте несколько примеров',t):
  ops=['+' if x=='сложение' else '−' if x=='вычитание' else '×' if x=='умножение' else ':' for x in re.findall('сложение|вычитание|умножение|деление',t)]
  results=[int(x) for x in re.findall(r'(?:получалось|получилось|получался)\s+(\d+)',t)]
  if ops and results:return compose([rule(op,result=result,max=maxval) for op,result in zip(ops,results) for _ in range(2)])
 eq=pairs(sol)
 if eq:
  rules=[]
  for exp,value in eq:
   m=re.fullmatch(r'\s*(\d+)\s*([+−\-×·:])\s*(\d+)\s*',exp)
   if m:rules.append(rule(m[2].replace('-','−').replace('·','×'),int(m[1]),int(m[3]),max=maxval))
  if rules:return compose(rules,True)
 # Verbal fixed operation in the prompt.
 rules=[]
 for m in re.finditer(r'(?:к|от)\s+(\d+)(?:\s*(?:кг|м|л|рублей|рубля))?\s+(прибавить|отнять)\s+(\d+)',t):rules.append(rule('+' if m[2]=='прибавить' else '−',int(m[1]),int(m[3]),max=maxval))
 for m in re.finditer(r'(\d+)(?:\s*(?:кг|м|л))?\s+(взять|разделить на)\s+(\d+)',t):rules.append(rule('×' if m[2]=='взять' else ':',int(m[1]),int(m[3]),max=maxval))
 return compose(rules,True) if rules else None

from practical_tasks import PRACTICAL,SOURCE_WORK
OV.update(SOURCE_WORK)
OV.update(PRACTICAL)
from story_tasks import STORY
OV.update(STORY)
from similar_tasks import SIMILAR,SIMILAR_561
for n,metadata in SIMILAR.items(): OV[n].update(metadata)
from number_game_tasks import NUMBER_GAMES
OV.update(NUMBER_GAMES)

ASK=re.compile(r'\s*\(?(?:Поставить|Поставьте|Поставь) вопрос и (?:решить|решите|реши) задачу\.\)?')
def twoParts(blk):
 # Testers read «… У Иры было 8 камешков» as more of the first problem. The second condition now sits
 # right above its own question, and «поставь вопрос» becomes its own line instead of trailing the text.
 if blk.get('kind')!='work':return blk
 fs=blk['fields'];choice=any(f.get('options') for f in fs)
 def tidy(t):
  t=re.sub(r'\s*/\s*',' ',t) if ' / ' in t else t
  return ASK.sub('\n\nВыбери вопрос и реши задачу.' if choice else '\n\nПоставь вопрос и реши задачу.',t).strip()
 parts=[x.strip(' \n/') for x in re.split(r'(?:\n|/)\s*…\s*',blk['prompt'])]
 plain=[f for f in fs if not f.get('options')];options=[f for f in fs if f.get('options')]
 if len(parts)==2 and all(parts) and len(plain)==2:
  # A question choice names its problem («Для первой задачи…»); unnamed ones ask about the second.
  first=[f for f in options if re.search('перв',f['label'])];options=[f for f in options if f not in first]
  second=options+[plain[1]]
  second[0]=dict(second[0],context=tidy(parts[1]))
  return dict(blk,prompt=tidy(parts[0]),fields=first+[plain[0]]+second)
 return dict(blk,prompt=tidy(blk['prompt']))
# Topics that stay long even after the first clause is taken.
PAGE_TITLES={76:'Задачи на «больше» и «меньше»',85:'Вычитание из 11 и из 12',89:'Задачи в два действия. Килограмм',134:'Умножение круглых десятков',135:'Умножение и деление круглых десятков'}
def pageTitle(topic):
 # A page title is the topic in a few words; the source topic lists every exercise on the page
 # («… (кролики 3 + 1, морковки 4 + 1), схемы с кружками»). Keep the first clause without brackets.
 t=re.sub(r'\s*\([^()]*\)?','',topic.split(':')[0]).strip(' .')
 for sep in [';',', ',' с опорой',' со схем',' и начало',' на основе']:
  if len(t)>45 and sep in t:t=t.split(sep)[0].strip(' .')
 return t[:1].upper()+t[1:]
out=[];unresolved=[]
seen_continuations=set()
for page in source:
 p=page['number']; blocks=[]
 for b in page['blocks']:
  n=b['number'];t=clean(b['text']);role=b['role'];sol=b['solution'];data=None
  # The source prints one problem across the page break, not a second exercise.
  if n==489 and n in seen_continuations:continue
  if n==489:seen_continuations.add(n)
  base=dict(id=b['id'],title=b['title'],prompt=t,sourceText=t,images=b['images'],exerciseNumber=n)
  if p<30:continue # Explicit first-decade mapping below.
  if not t or (not n and re.search(r'служебн|колонцифр|номер страницы|сигнатур|Концовочная',role+' '+b['title'],re.I)):continue
  if n in OV:data=OV[n]
  elif n and re.search(r'Составьте|Составить|Придумайте|Дополните',t,re.I):data=creative(b,p)
  elif blanks(t):data=work(blanks(t)+[(e+' =',calc(e)) for e in exprs(t)])
  elif re.search('пример|выражени|подготовительн',role,re.I) or (n and not re.search('[А-Яа-яёЁ]{3}',t)):
   es=exprs(re.sub(r'(?:[Сс]трока|[Сс]толбик|[Кк]олонка|[Сс]толбец)\s*\d+\s*:', '', t))
   if es:data=work([(e+' =',calc(e)) for e in es])
  if data is None and n:
   eq=pairs(sol)
   if eq:data=work([(e+' =',v) for e,v in eq])
   else:
    # Only a complete unambiguous scalar key may fall back to one answer.
    # Lists, place values and explanations require an explicit contract above.
    m=re.fullmatch(r'(?:Ответ(?:ы)?\s*:\s*)?(\d+)(?:\s+(?:детей|рублей|копеек))?[.]?',sol.strip())
    if m:data=work([('Ответ',int(m[1]))])
  if data is None and n:unresolved.append(dict(page=p,number=n,id=b['id'],text=t,solution=sol));continue
  if data is None:
   if not n and t.lower() in ['нет','нет.','—']:continue
   data=dict(kind='read',body=t,prompt='Рассмотри')
  # Printed ready examples remain demonstrations, not forced answer fields.
  if not n and re.search('образец|правило|пояснение|заголовок',role,re.I):data=dict(kind='read',body=t,prompt='Рассмотри')
  if n in QUESTION_FIELDS and data.get('kind')=='work':
   data=dict(data,fields=QUESTION_FIELDS[n]+data['fields'])
   if n==515:data.pop('prompt',None)
  # A column of expressions is the whole source text; the fields carry the expressions, the prompt says what to do.
  if n and data.get('kind')=='work' and bareExamples(t) and 'prompt' not in data:base['prompt']='Реши примеры и запиши ответы.'
  if n:base['title']=heading(b,data)
  blocks.append(twoParts(dict(base,**data)))
 out.append(dict(id=f'page-{p:03}',number=p,title=PAGE_TITLES.get(p) or pageTitle(page['topic']),subtitle=('Первый десяток' if p<59 else 'Второй десяток' if p<126 else 'Первая сотня'),hero=f'page_{p:03}',sourceDoc=f'textbook/page_docs/arithmetic_grade1_pchelko_1959_p{p:03}.md',blocks=blocks))
if unresolved:(ROOT/'scripts/content/unresolved.json').write_text(json.dumps(unresolved,ensure_ascii=False,indent=2)+'\n')
print('Unresolved',len(unresolved),[b['number'] for b in unresolved])

from early_pages import build
for p,blocks in build(assets,calc).items():out[p-11]['blocks']=blocks
# Append source-only illustration cards for decorative/teaching images without an assigned exercise.
for page in out:
 used={x for b in page['blocks'] for x in b['images']}
 missing=[a['id'] for a in assets if a['page']==page['number'] and a['id'] not in used]
 if missing:page['blocks'].insert(0,dict(id=f"p{page['number']:03}-source-art",kind='read',title='Рисунки страницы',prompt='Рассмотри',body='Рассмотри рисунки. Затем переходи к заданиям.',images=missing))
 if not page['blocks']:page['blocks']=[dict(id=f"p{page['number']:03}-original",kind='read',title=page['title'],prompt='Рассмотри страницу',body='Оригинальная страница учебника.',images=[page['hero']])]
# What the child reads under the heading is the task, not a description of how the page is printed.
# sourceText keeps the transcription; the prompt is rewritten where it described layout or asked nothing.
PROMPTS={
 264:'На первой проволоке 5 косточек, а на второй столько же и ещё 1 косточка. На второй проволоке на 1 косточку больше, чем на первой. Сколько косточек на второй проволоке?',
 505:'Ученик говорит: „Я прибавил к 6 число и получил в ответе 11. Угадайте, какое число я прибавил“. Какое число прибавил ученик? Проведите и вы такую игру.',
 571:'Считайте по 5 до 20. Потом решите примеры.',
 739:'Найдите в таблице числа: 5, 15, 25, 35, 45, 55, 65, 75, 85, 95.\nНайдите в таблице числа: 3, 23, 43, 63, 83.',
 318:'Решите примеры. Потом найдите пример с ответом 13, затем 14, 15 и так далее.',
 610:'Решите примеры. Потом найдите пример с ответом 11, затем с ответом 12, 13, 14, 15 и так далее до 20.',
 578:'В каждом столбике найдите пример с нужным ответом. В первом столбике — с ответом 9. Во втором — с ответом 20. В третьем — с ответом 16.',
 659:'В каждом столбике найдите пример с нужным ответом. В первом столбике — с ответом 5. Во втором — с ответом 6. В третьем — с ответом 4. В четвёртом — с ответом 7.',
 699:'В каждом столбике найдите пример с нужным ответом. В первом столбике — с ответом 1. Во втором — с ответом 2. В третьем — с ответом 3. В четвёртом — с ответом 4.',
 813:'В каждом столбике найдите пример с нужным ответом. В первом столбике — с ответом 100. Во втором — с ответом 12. В третьем — с ответом 2.',
 638:'Разделить поровну между тремя учениками: 3 карандаша, 6 карандашей, 9 карандашей, 12 карандашей, 15 карандашей, 18 карандашей.',
 654:'Разделить поровну между 4 учениками: 4 пера, 8 перьев, 12 перьев, 16 кубиков, 20 кубиков.',
 672:'Разделить поровну между 5 учениками: 5 кубиков, 10 кубиков, 15 кубиков, 20 кубиков.',
 776:'От 100 отнимайте по 10, пока не получится 0.',
 647:'Я задумал число. Чтобы угадать его, умножьте 9 на 2. Разделите полученное число на 3. Прибавьте ко вновь полученному числу столько же. Какое число я задумал?',
}
CUTS=[r'\n\s*(?:Справа от рисунка запись|Ниже по центру)\s*:[\s\S]*$',r'\n?\s*В большой рамке[\s\S]*$',r'\s*Под условием не палочки[\s\S]*$',r':\s*Строки[\s\S]*$',r'\s*\(в одну строку[^)]*\)']
PRINTED=r'рамк[аеи]\b|в рамке|рамкой|окружност|столбик(?:а|ов) по \d|верхн(?:яя|ий) (?:строка|ряд)|строка \d|[Сс]права от|[Сс]лева[:;]|[Сс]лева (?:образец|\d)|под чертой|\(черта\)|[Пп]од костяшками|далее рисунок|вертикальной черты|В каждой прямоугольник|над рисунком|[Вв]нутри строки|справа операция'
def tells(t):return bool(re.search(r'(?:^|[.!?:]\s+|\n\s*)(?:[«„"(]?[А-ЯЁ][а-яё]+(?:ите|йте|ьте|ить|ать|ять|и|й|ь|ись)\b)|\?|(?<![а-яё])[а-яё]{3,}(?:ите|йте|ьте)(?![а-яё])',t))
def childPrompt(blk,number):
 kind=blk['kind'];t=blk['prompt']
 if kind=='read':return blk
 if number in PROMPTS and not blk.get('ownPrompt'):t=PROMPTS[number]
 for cut in CUTS:t=re.sub(cut,'',t)
 t=re.sub(r'\s*Далее с новой строки \(без номера\):\s*','\n\n',t)
 t=re.sub(r'(Считайте по \d+ до \d+):[^\n]*',r'\1.',t)
 t=re.sub(r'^(Разделить[^:\n]*между [^:\n]*):\s*$',r'\1.',t.strip(),flags=re.M) if kind=='activity' else t
 fs=blk.get('fields') or []
 sums=bool(fs) and all(re.search('[=□]',f['label']) and not re.search('[А-Яа-яЁё]{3}',f['label']) for f in fs)
 if kind=='work' and sums and (re.search(PRINTED,t) or not tells(t)):
  both=any('×' in f['label'] for f in fs) and any('+' in f['label'] for f in fs) and not number
  t='Сложи одинаковые числа. Потом запиши умножением.' if both else 'Реши примеры и запиши ответы.'
 return dict(blk,prompt=t.strip())
# Testers read the page-description blocks («Заголовки», «Блок 6. Домино 6 + 1», «Рисунки страницы») as
# steps that ask nothing. On pages from 30 on they are folded: headings go, a mid-page heading marks a new
# topic, pictures meet in one opening step, and only rules and worked samples stay as steps of their own.
LAYOUT=r'жирн|курсив|разрядк|по центру|рамк|крупно|прописн|шрифт|без ответов|в одну строку|над чертой|черта|подчёрк'
def plainBody(t):
 t=re.sub(r'\s*\((?:[^()]*?(?:'+LAYOUT+r')[^()]*)\)','',t)
 t=re.sub(r'[;,]?\s*под чертой\s*','\n',t)
 t=re.sub(r'^.*?(?=(?:Ряд|Столбик) 1:)','',t,flags=re.S)
 t=re.sub(r'(?:Ряд|Столбик) \d+:\s*','',t).replace(' | ','\n')
 t=re.sub(r'^\s*(?:В рамке|в рамке, три столбца|справа от рисунка)\s*:\s*','',t,flags=re.M)
 return '\n'.join(x.strip() for x in t.splitlines() if x.strip()).strip()
def plainTitle(t):
 t=re.sub(r'^Блок \d+\.\s*|^Ненумерованная\s+','',t)
 t=re.sub(r'\s*\((?:в рамке)\)|[«»]','',t).replace(' в рамке','').strip(' .')
 return t[:1].upper()+t[1:]
def noTypeNotes(t):
 # «(дороже жирным)», «(см курсивом)», «Внизу слева сигнатура 6.» describe the print, not the task.
 t=re.sub(r'\s*\((?:[^()]*?(?:жирн|курсив|набран|шрифт|подчёркнут)[^()]*)\)','',t)
 t=re.sub(r'\s*Внизу слева сигнатура[^.]*\.+','',t)
 return t.strip()
def serviceKind(b):
 t=plainTitle(b['title'])
 if re.search(r'^(?:Заголов|Подзаголов|Колонтитул|Часть|выходные)',t,re.I):return 'heading'
 body=b.get('body','')
 if re.search(r'Правило|Образец|Таблиц|Запис|Соотношение',t) and not re.search(r'^Заголовок|Рисунок|Под ним|связки',body):return 'rule'
 return 'picture'
def headingText(b):
 t=plainBody(b.get('body',''))
 t=re.sub(r'^(?:Подзаголовок|Заголовок)\s*:?\s*','',t).split('\n')[0].strip(' .«»')
 return t[:1].upper()+t[1:].lower() if t.isupper() else t
for page in out:
 if page['number']<30 or page['number']==143:continue
 look=None;kept=[];numbered=False
 for b in page['blocks']:
  if b['kind']!='read' or b.get('exerciseNumber'):
   numbered=numbered or bool(b.get('exerciseNumber'));kept.append(b);continue
  kind='picture' if b['id'].endswith('-source-art') else serviceKind(b)
  if kind=='heading':
   topic=headingText(b)
   # A heading after the first task starts a new topic on the same page; say so instead of dropping it.
   if numbered and topic and len(topic)>3 and not re.search(r'сигнатур|номер страницы|колонцифр',b.get('body','')+b['title']):kept.append(dict(b,title='Новая тема',body=topic+'.',prompt='Рассмотри'))
   elif b['images']:look=look or dict(b);look['images']=list(dict.fromkeys(look['images']+b['images']))
   continue
  if kind=='rule':kept.append(dict(b,title=plainTitle(b['title']),body=plainBody(b.get('body',''))));continue
  if look is None:look=dict(b,id=b['id'],title='Рассмотри картинки',prompt='Рассмотри',body='Рассмотри картинки. Потом переходи к заданиям.',images=list(b['images']))
  else:look['images']=list(dict.fromkeys(look['images']+b['images']))
 if look and look['images']:kept.insert(0,dict(look,title='Рассмотри картинки',body='Рассмотри картинки. Потом переходи к заданиям.'))
 # «Блок 8.» numbers the description, not anything the child sees.
 kept=[dict(b,title=re.sub(r'^Блок \d+\.\s*','',b['title']),**({'prompt':noTypeNotes(b['prompt'])} if 'prompt' in b else {})) for b in kept]
 kept=[childPrompt(b,b.get('exerciseNumber')) for b in kept]
 # An unnumbered scheme with answer fields is headed by its work, not by the description of the drawing.
 page['blocks']=[dict(b,title='Сложение и умножение' if any('×' in f['label'] for f in b['fields']) and any('+' in f['label'] for f in b['fields']) else examplesHeading(' '.join(f['label'] for f in b['fields']))) if b['kind']=='work' and not b.get('exerciseNumber') and re.search(r'^(?:Схема|Рамка) «|под рамками',b['title']) else b for b in kept]
# The table of contents is one page to read, not four steps of «Блок N».
toc=out[143-11]
parts=[b for b in toc['blocks'] if re.search('Часть',b['title'])]
lines=[]
for b in parts:
 rows=[x.strip() for x in b['body'].splitlines() if x.strip() and x.strip()!='Стр.']
 lines.append(rows[0].strip(' .').capitalize())
 lines+=['   '+re.sub(r'\s*(?:\.\s*){2,}\s*(\d+)$',r' — стр. \1',re.sub(r'\s*\(в книге[^)]*\)','',x)) for x in rows[1:]]
 lines.append('')
toc['blocks']=[dict(toc['blocks'][0],title='Оглавление',prompt='Рассмотри',body='\n'.join(lines).strip(),images=[])]
if unresolved:raise SystemExit('Unresolved exercise mappings')
# Parts that the original combines with a numbered calculation are additional actions.
extras={104:[dict(id='p104-compose561',kind='recipe',title='Своя задача к № 561',prompt='Выбери числа для похожей задачи про примеры в столбиках.',formula='a*b+c',max=20,images=[])],105:[dict(id='p105-count571',kind='activity',title='Считай по пять',prompt='Считай по пять до двадцати.',activity=dict(mode='sequence',targets=[5,10,15,20]),images=[])],142:[dict(id='p142-play892',kind='targetGame',title='Сыграй сам',prompt='Игроки ходят по очереди. Нажимай на круг: 10, 20 или 30 очков. Кто первым наберёт 100?',images=[])]}
for p,n,div,values in [(117,654,4,[4,8,12,16,20]),(119,672,5,[5,10,15,20])]:extras.setdefault(p,[]).append(dict(id=f'p{p:03}-division{n}',title=f'Запиши деление к № {n}',prompt='Запиши, сколько предметов получилось в каждой группе.',images=[],**work([(f'{v} : {div} =',v//div) for v in values])))
for p,blocks in extras.items():
 for block in blocks:
  if block['id']=='p104-compose561': block.update(SIMILAR_561)
 out[p-11]['blocks'].extend(blocks)
# Attach necessary visual givens to the task itself, including legacy pages.
imageMap={10:['p031_birds_branch_6_1'],11:['p031_swallows_wire_7'],30:['p034_five_buttons'],149:['p050_saucer_cup_prices'],360:['p078_soap_2_rub','p078_toothbrush_3_rub','p078_bandage_1_rub'],591:['p108_spoon_6_rubles','p108_fork_4_rubles','p108_knife_3_rubles'],711:['p124_three_books_brace_6_rub'],712:['p124_three_books_6_rub_each'],892:['p142_target_circles_10_20_30']}
for page in out:
 for b in page['blocks']:
  n=b.get('exerciseNumber')
  if n in imageMap:b['images']=list(dict.fromkeys(b['images']+imageMap[n]))
  for a in assets:
   if a['page']==page['number'] and n and re.search(r'№\s*'+str(n)+r'(?!\d)',a['description']):b['images']=list(dict.fromkeys(b['images']+[a['id']]))
# Keep typed generated data free of Metro/runtime filesystem reads.
rendered='// Generated by scripts/content/build_course.py. Edit source mappings, not this file.\nexport const fullBookData = '+json.dumps(out,ensure_ascii=False,separators=(',',':'))+';\n'
if '--check' in sys.argv:
 assert (ROOT/'src/content/fullBookData.ts').read_text()==rendered, 'Generated app data is stale; rerun build_course.py and review changes'
else:(ROOT/'src/content/fullBookData.ts').write_text(rendered)
print('Generated',sum(len(p['blocks']) for p in out),'blocks; numbered exercises',len({b.get('exerciseNumber') for p in out for b in p['blocks'] if b.get('exerciseNumber')}))
