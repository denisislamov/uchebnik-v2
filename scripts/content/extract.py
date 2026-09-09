"""Extract source blocks without interpreting answers. The page Markdown remains authoritative."""
from pathlib import Path
import re,json,sys
ROOT=Path(__file__).resolve().parents[2]
def clean(s):
 s=re.sub(r'\[([^\]]+)\]\([^)]*\)',r'\1',s)
 s=re.sub(r'[*`]', '', s)
 s=re.sub(r'^> ?', '', s,flags=re.M)
 s=re.sub(r'^\s*[-–] \*?\*?', '', s,flags=re.M)
 return s.strip().strip('«»')
book=[]
for n in range(11,145):
 path=ROOT/f'textbook/page_docs/arithmetic_grade1_pchelko_1959_p{n:03}.md';doc=path.read_text()
 section=lambda k:re.search(rf'^## {k}\..*?\n(.*?)(?=^## [1-6]\. |\Z)',doc,re.M|re.S).group(1)
 body=section(2);answers=section(3)
 body=re.sub(r'^## ', '### ', body, flags=re.M)
 # Legacy pages group several tasks under one heading; split their quoted conditions.
 body=re.sub(r'^> \*\*(\d+)\.\*\*',r'### \1.\n',body,flags=re.M)

 rows={}
 for row in answers.splitlines():
  if re.match(r'^\|\s*\d+',row):
   cells=[x.strip() for x in row.split('|')[1:-1]];num=int(re.match(r'\d+',cells[0]).group());rows[num]=cells
 blocks=[]
 for i,m in enumerate(re.finditer(r'^### (.*?)\n(.*?)(?=^### |\Z)',body,re.M|re.S)):
  title,raw=m.groups();num=None
  nm=re.search(r'(?:№\s*|(?:Задача|Задание|Примеры|Упражнение|Вопрос)\s+)(\d+)',title,re.I) or re.match(r'(\d+)\.',title)
  if nm:num=int(nm.group(1))
  # The labeled text section can include fenced arithmetic columns and several lines.
  textmatch=re.search(r'- \*\*Текст[^*]*\*\*:?\s*(.*?)(?=\n- \*\*|\Z)',raw,re.S)
  text=textmatch.group(1) if textmatch else raw
  rolematch=re.search(r'- \*\*Тип блока:\*\*\s*(.*)',raw)
  role=rolematch.group(1) if rolematch else title
  if not num:
   nm=re.match(r'[«\s]*(\d+)\.',text)
   if nm:num=int(nm.group(1))
  imageids=list(dict.fromkeys(re.findall(r'p\d{3}_[a-z0-9_]+(?=\.png)',raw)))
  key=rows.get(num)
  solution=key[3] if key and len(key)>=4 else ''
  if not solution:
   for label in ['Педагогическая функция','Предлагаемая интерактивная реализация']:
    mm=re.search(rf'- \*\*{label}:\*\*\s*(.*?)(?=\n- \*\*|\Z)',raw,re.S)
    if mm:solution+='\n'+mm.group(1)
   if not textmatch:
    localized=re.search(rf'№\s*{num}\s*[:.]\s*(.*?)(?=№\s*\d|\n###|\Z)',answers,re.S) if num else None
    solution=localized.group(1) if localized else ''
  blocks.append(dict(id=f'p{n:03}-source{i+1:02}',title=clean(title),number=num,role=role,text=clean(text),raw=raw,solution=clean(solution),images=imageids))
 topic=re.search(r'\*\*Тема страницы:\*\* (.*)',doc).group(1)
 book.append(dict(number=n,topic=topic,blocks=blocks,answers=answers))
rendered=json.dumps(book,ensure_ascii=False,indent=2)+'\n'
if '--check' in sys.argv:
 assert (ROOT/'scripts/content/source_blocks.json').read_text()==rendered, 'Source snapshot is stale; rerun extract.py and review changes'
else:(ROOT/'scripts/content/source_blocks.json').write_text(rendered)
print('Pages',len(book),'blocks',sum(len(p['blocks']) for p in book))
seen={b['number'] for p in book for b in p['blocks'] if b['number']}
print('Unlinked exercise numbers',sorted(set(range(1,893))-seen))
print('No numbered blocks',[(p['number'],len(p['blocks'])) for p in book if p['number']>=30 and not any(b['number'] for b in p['blocks'])])
