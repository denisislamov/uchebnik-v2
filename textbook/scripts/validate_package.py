"""Validate deliverable links, page/exercise coverage, pixel provenance and numeric equalities."""
from pathlib import Path
import ast,operator,re,json,hashlib,datetime
from urllib.parse import unquote
import fitz
from PIL import Image,ImageChops
ROOT=Path(__file__).resolve().parents[1]
issues=[]; links=0;checked=0;math_bad=[]
ops={ast.Add:operator.add,ast.Sub:operator.sub,ast.Mult:operator.mul,ast.Div:operator.truediv}
def calculate(s):
 t=ast.parse(s.translate(str.maketrans({'−':'-','–':'-','×':'*',':':'/','÷':'/'})),mode='eval')
 def visit(n):
  if isinstance(n,ast.Expression):return visit(n.body)
  if isinstance(n,ast.Constant) and type(n.value) in (int,float):return n.value
  if isinstance(n,ast.BinOp) and type(n.op) in ops:return ops[type(n.op)](visit(n.left),visit(n.right))
  raise ValueError('unsupported expression')
 return visit(t)
pat=re.compile(r'(?<![\d№])(\d+(?:[ \t]*[+−×÷:–-][ \t]*\d+)+)[ \t]*=[ \t]?(\d+(?:[ \t]*[+−×÷:–-][ \t]*\d+)*)')
# These are prose colon labels, manually checked in context, not arithmetic.
prose_colons={
 37:{'3: 4 − 3 = 1'},53:{f'{x}: 1+{x}={x+1}' for x in range(2,10)},
 72:{'20: 20 = 10 + 10'},73:{'1: 16 + 4 = 20','2: 20 − 6 = 14','1: 10 + 6 = 16','2: 16 − 5 = 11'},
 86:{'13: 13 − 3 = 10'},103:{'1: 4 × 5 = 20','2: 20 − 2 = 18'},141:{'2: 40 : 2 = 20'}}
docs=sorted((ROOT/'page_docs').glob('*.md'))
for f in [*ROOT.glob('*.md'),*docs]:
 s=f.read_text()
 # Ignore code examples for link scanning, retain real inline links.
 s_links=re.sub(r'```.*?```','',s,flags=re.S)
 for target in re.findall(r'\]\(([^)]+)\)',s_links):
  target=unquote(target.strip('<>').split('#')[0])
  if not target or re.match(r'^[a-zA-Z]+:',target):continue
  links+=1
  if (f.parent/target).resolve() == (ROOT/'data/quality.json').resolve():continue
  if not (f.parent/target).exists():issues.append(f'missing link {f.relative_to(ROOT)}: {target}')
 if f.parent.name!='page_docs':continue
 n=int(f.stem[-3:])
 for lineno,line in enumerate(s.splitlines(),1):
  if line.startswith('#') or '.png' in line or 'http' in line:continue
  line=re.sub(r'№\s*\d+\s*:', '',line)
  for m in pat.finditer(line):
   if m[0] in prose_colons.get(n,set()):continue
   if any(re.search(r'\d[ \t]{3,}[+−×÷:–-]',g) for g in m.groups()):continue
   try:
    a,b=map(calculate,m.groups());checked+=1
    if abs(a-b)>1e-6:math_bad.append(dict(page=n,line=lineno,expression=m[0]))
   except (ValueError,ZeroDivisionError,SyntaxError):continue
pdf=ROOT.parent/'Matematyka_Pchelko_1klas_1959_skachat.pdf'
source=fitz.open(pdf);uri_links=[dict(page=i+1,uri=l['uri']) for i,p in enumerate(source) for l in p.get_links() if l.get('uri')]
page_records=json.loads((ROOT/'data/pages.json').read_text());ex=json.loads((ROOT/'data/exercises.json').read_text());assets=json.loads((ROOT/'data/assets.json').read_text())
if source.page_count!=144 or len(docs)!=144 or len(page_records)!=144:issues.append('page count mismatch')
missing_ex=sorted(set(range(1,893))-{x['number'] for x in ex})
if missing_ex:issues.append('missing exercise numbers')
nonmatching=[];unlinked=[];page_cache={}
for a in assets:
 f=ROOT/a['path'];page=a['page']
 if page not in page_cache:page_cache[page]=Image.open(ROOT/a['sourcePage']).convert('RGB')
 if not a['bbox'] or ImageChops.difference(page_cache[page].crop(a['bbox']),Image.open(f).convert('RGB')).getbbox():nonmatching.append(a['id'])
 if hashlib.sha256(f.read_bytes()).hexdigest()!=a['sha256']:issues.append('hash mismatch '+a['id'])
 if f.name not in (ROOT/page_records[page-1]['document']).read_text():unlinked.append(a['id'])
 if a['width']!=a['bbox'][2]-a['bbox'][0] or a['height']!=a['bbox'][3]-a['bbox'][1]:issues.append('size mismatch '+a['id'])
if len(list((ROOT/'images').glob('*.png')))!=len(assets):issues.append('asset registry mismatch')
if nonmatching:issues.append('pixel mismatch')
if unlinked:issues.append('unlinked assets')
if math_bad:issues.append('numeric equality candidates')
report=dict(checkedAt=datetime.datetime.now(datetime.timezone.utc).isoformat(),pdfPageCount=source.page_count,pageDocuments=len(docs),pageScans=len(list((ROOT/'pages').glob('*.png'))),exerciseNumbers=len(ex),missingExerciseNumbers=missing_ex,splitExercises=[x for x in ex if x['splitAcrossPages']],assets=len(assets),exactSourcePixelMatches=len(assets)-len(nonmatching),assetPixelMismatches=nonmatching,unlinkedAssets=unlinked,localLinksChecked=links,numericEqualitiesChecked=checked,numericEqualityCandidates=math_bad,pdfExternalUriAnnotations=uri_links,sourcePdfSha256=hashlib.sha256(pdf.read_bytes()).hexdigest(),issues=issues,passed=not issues)
(ROOT/'data/quality.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(report,ensure_ascii=False,indent=2))
raise SystemExit(0 if not issues else 1)
