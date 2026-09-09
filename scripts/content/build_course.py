"""Build full-book content from page specifications plus explicit editorial mappings.
Unknown exercise numbers fail the build; originals remain available separately.
"""
import json,re,ast,operator,sys
from pathlib import Path
from overrides import OV,FRAMES,FORMULAS
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
 return [m.group() for m in re.finditer(EXPR,s) if not re.match(r'\s*=\s*\d',s[m.end():])]
def stripunits(s):return re.sub(r'(?<=\d)\s*(?:руб\.?|коп\.?|кг|см|м|л)(?=\s*[+−\-×·∙:÷*=])','',s)
def pairs(s):
 out=[]
 for m in re.finditer('('+EXPR+r')\s*=\s*(\d+)',stripunits(s)):
  try:
   if calc(m[1])==int(m[2]) and (m[1],int(m[2])) not in out:out.append((m[1],int(m[2])))
  except (ValueError,SyntaxError,ZeroDivisionError):pass
 return out

def fields(p):return [{'id':f'q{i+1}','label':str(label),'expected':str(v)} for i,(label,v) in enumerate(p)]
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
OV[489]=work([('Всего кусков пластилина в двух коробках',14),('Осталось после выдачи 13 кусков',1)])
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

out=[];unresolved=[]
for page in source:
 p=page['number']; blocks=[]
 for b in page['blocks']:
  n=b['number'];t=clean(b['text']);role=b['role'];sol=b['solution'];data=None
  base=dict(id=b['id'],title=f'№ {n}' if n else b['title'],prompt=t,sourceText=t,images=b['images'],exerciseNumber=n)
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
    m=re.search(r'(?:Ответ(?:ы)?\s*:|^)(\d+)(?:[ .;]|$)',sol)
    if m:data=work([('Ответ',int(m[1]))])
  if data is None and n:unresolved.append(dict(page=p,number=n,id=b['id'],text=t,solution=sol));continue
  if data is None:
   if not n and t.lower() in ['нет','нет.','—']:continue
   data=dict(kind='read',body=t,prompt='Рассмотри и послушай')
  # Printed ready examples remain demonstrations, not forced answer fields.
  if not n and re.search('образец|правило|пояснение|заголовок',role,re.I):data=dict(kind='read',body=t,prompt='Рассмотри и послушай')
  blocks.append(dict(base,**data))
 out.append(dict(id=f'page-{p:03}',number=p,title=page['topic'].split(':')[0][:80],subtitle=('Первый десяток' if p<59 else 'Второй десяток' if p<126 else 'Первая сотня'),hero=f'page_{p:03}',sourceDoc=f'textbook/page_docs/arithmetic_grade1_pchelko_1959_p{p:03}.md',blocks=blocks))
if unresolved:(ROOT/'scripts/content/unresolved.json').write_text(json.dumps(unresolved,ensure_ascii=False,indent=2)+'\n')
print('Unresolved',len(unresolved),[b['number'] for b in unresolved])

from early_pages import build
for p,blocks in build(assets,calc).items():out[p-11]['blocks']=blocks
# Append source-only illustration cards for decorative/teaching images without an assigned exercise.
for page in out:
 used={x for b in page['blocks'] for x in b['images']}
 missing=[a['id'] for a in assets if a['page']==page['number'] and a['id'] not in used]
 if missing:page['blocks'].insert(0,dict(id=f"p{page['number']:03}-source-art",kind='read',title='Рисунки страницы',prompt='Рассмотри и послушай',body='Рассмотри рисунки. Затем переходи к заданиям.',images=missing))
 if not page['blocks']:page['blocks']=[dict(id=f"p{page['number']:03}-original",kind='read',title=page['title'],prompt='Рассмотри страницу',body='Оригинальная страница учебника.',images=[page['hero']])]
if unresolved:raise SystemExit('Unresolved exercise mappings')
# Parts that the original combines with a numbered calculation are additional actions.
extras={104:[dict(id='p104-compose561',kind='recipe',title='Своя задача к № 561',prompt='Выбери числа для похожей задачи про примеры в столбиках.',formula='a*b+c',max=20,images=[])],105:[dict(id='p105-count571',kind='activity',title='Считай по пять',prompt='Считай по пять до двадцати.',activity=dict(mode='sequence',targets=[5,10,15,20]),images=[])],142:[dict(id='p142-play892',kind='targetGame',title='Сыграй сам',prompt='Игроки ходят по очереди. Нажимай на круг: 10, 20 или 30 очков. Кто первым наберёт 100?',images=[])]}
extras[103]=[dict(id='p103-squares554',kind='construction',title='Собери три квадрата к № 554',prompt='Соедини точки. Для каждого квадрата нужны четыре отдельные палочки.',shapes=['square']*3,images=[])]
for p,n,div,values in [(117,654,4,[4,8,12,16,20]),(119,672,5,[5,10,15,20])]:extras.setdefault(p,[]).append(dict(id=f'p{p:03}-division{n}',title=f'Запиши деление к № {n}',prompt='Запиши, сколько предметов получилось в каждой группе.',images=[],**work([(f'{v} : {div} =',v//div) for v in values])))
for p,blocks in extras.items():out[p-11]['blocks'].extend(blocks)
# Attach necessary visual givens to the task itself, including legacy pages.
imageMap={30:['p034_five_buttons'],149:['p050_saucer_cup_prices'],360:['p078_soap_2_rub','p078_toothbrush_3_rub','p078_bandage_1_rub'],591:['p108_spoon_6_rubles','p108_fork_4_rubles','p108_knife_3_rubles'],711:['p124_three_books_brace_6_rub'],712:['p124_three_books_6_rub_each'],892:['p142_target_circles_10_20_30']}
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
