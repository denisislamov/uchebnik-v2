from pathlib import Path
import cv2,json,hashlib,re
from PIL import Image,ImageDraw
ROOT=Path(__file__).resolve().parents[1]
assets=[]; failures=[]
for n in range(1,145):
 page=ROOT/'pages'/f'page_{n:03}.png'; src=cv2.imread(str(page));h,w=src.shape[:2]
 doc=ROOT/'page_docs'/f'arithmetic_grade1_pchelko_1959_p{n:03}.md';s=doc.read_text()
 for f in sorted((ROOT/'images').glob(f'p{n:03}_*.png')):
  im=cv2.imread(str(f));ih,iw=im.shape[:2]
  match=cv2.matchTemplate(src,im,cv2.TM_SQDIFF_NORMED);score,_,loc,_=cv2.minMaxLoc(match);x,y=loc
  exact=bool((src[y:y+ih,x:x+iw]==im).all())
  if not exact:failures.append((f.name,score))
  desc=''
  for line in s[s.find('## 4.'):].splitlines():
   if line.startswith('|') and f.name in line:desc=line.split('|')[2].strip();break
  if not desc:
   for line in s.splitlines():
    if f.name in line:desc=line.strip();break
  assets.append(dict(id=f.stem,page=n,path='images/'+f.name,sourcePage=f'pages/page_{n:03}.png',width=iw,height=ih,bbox=[x,y,x+iw,y+ih] if exact else None,sourceWidth=w,sourceHeight=h,exactSourceMatch=exact,sha256=hashlib.sha256(f.read_bytes()).hexdigest(),description=desc))
 # convert inert backtick paths to portable clickable links
 s=re.sub(r'`(\.\./(?:images|pages)/[^`]+\.png)`',lambda m:f'[{Path(m[1]).name}]({m[1]})',s)
 s=re.sub(r'№(\d+):(?=\S)',r'№\1: ',s)
 doc.write_text(s)
(ROOT/'data'/'assets.json').write_text(json.dumps(assets,ensure_ascii=False,indent=2))
# Compact numbered contact sheets for visual crop inspection. These are QA files, not source assets.
qa=ROOT/'_work'/'asset_contact_sheets';qa.mkdir(exist_ok=True)
for start in range(0,len(assets),30):
 batch=assets[start:start+30];canvas=Image.new('RGB',(1500,1500),'white');d=ImageDraw.Draw(canvas)
 for i,a in enumerate(batch):
  x=(i%5)*300;y=(i//5)*250
  im=Image.open(ROOT/a['path']).convert('RGB');im.thumbnail((286,208));canvas.paste(im,(x+7+(286-im.width)//2,y+28+(208-im.height)//2));d.text((x+5,y+4),str(start+i+1)+' '+a['id'][:36],fill='black')
 canvas.save(qa/f'assets_{start//30+1:02}.jpg')
print(json.dumps(dict(count=len(assets),nonmatching=failures),ensure_ascii=False))
