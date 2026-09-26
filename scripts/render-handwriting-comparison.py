"""Visual QA against original PNGs. Requires Pillow; does not change textbook assets."""
from pathlib import Path
import subprocess, json, hashlib, sys
from PIL import Image, ImageDraw
root=Path(__file__).resolve().parents[1]
source="""import {digitSamples,sampleDigit} from './src/content/handwrittenDigits.ts'; console.log(JSON.stringify(Object.fromEntries(Object.keys(digitSamples).map(n=>[n,{...digitSamples[n],points:sampleDigit(n)}]))));"""
samples=json.loads(subprocess.check_output(['node','--experimental-strip-types','--input-type=module','-e',source],cwd=root))
out=Image.new('RGB',(1500,650),'white');draw=ImageDraw.Draw(out);fixture={}
for i,(n,s) in enumerate(samples.items()):
 p=root/'textbook/images'/f"{s['asset']}.png";original=Image.open(p).convert('RGB')
 fixture[s['asset']]={'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'ink':[[x,y]for y in range(original.height)for x in range(original.width)if max(original.getpixel((x,y)))<128]}
 image=original.resize((original.width*2,original.height*2));d=ImageDraw.Draw(image)
 for stroke in s['points']:
  d.line([((v['x']*s['cell']+s['origin']['x'])*2,(v['y']*s['cell']+s['origin']['y'])*2)for v in stroke],fill=(230,0,200),width=2)
 x=i%5*300;y=i//5*320;out.paste(image,(x,y+35));draw.text((x+10,y+10),n+' - magenta = tracing path',fill='black')
out.save(root/'docs/handwritten-digit-overlay.png')
if '--update-fixture' in sys.argv:
 (root/'tests/fixtures/handwriting-ink.json').write_text(json.dumps(fixture,separators=(',',':'))+'\n')
