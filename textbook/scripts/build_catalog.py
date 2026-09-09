"""Rebuild portable navigation; reads authoritative per-page Markdown, never rewrites it."""
from pathlib import Path
import re,json
ROOT=Path(__file__).resolve().parents[1]
def field(s,key):
 m=re.search(r'^- \*\*'+re.escape(key)+r':\*\* (.*)$',s,re.M)
 return m[1] if m else ''
records=[]; exercises={}
for n in range(1,145):
 f=ROOT/'page_docs'/f'arithmetic_grade1_pchelko_1959_p{n:03}.md'; s=f.read_text()
 nums=sorted(set(map(int,re.findall(r'^### (\d+)\.',s,re.M)+re.findall(r'^\| (\d+)(?=[ .(а-я–|])',s,re.M)+re.findall(r'^> \*\*(\d+)\.',s,re.M)))) if n>=30 else []
 nums=[x for x in nums if 1<=x<=892]
 for x in nums:exercises.setdefault(x,[]).append(n)
 assets=[x.stem for x in sorted((ROOT/'images').glob(f'p{n:03}_*.png'))]
 records.append(dict(id=f'p{n:03}',pdfPage=n,printedPage=None if n in (1,2,144) else n,document='page_docs/'+f.name,scan=f'pages/page_{n:03}.png',section=field(s,'Раздел'),topic=field(s,'Тема страницы'),pageType=field(s,'Тип страницы'),exerciseLabel=field(s,'Номера заданий на странице'),exerciseNumbers=nums,assetIds=assets))
(ROOT/'data/pages.json').write_text(json.dumps(records,ensure_ascii=False,indent=2)+'\n')
(ROOT/'data/exercises.json').write_text(json.dumps([dict(number=k,pages=v,documents=[records[n-1]['document'] for n in v],splitAcrossPages=len(v)>1) for k,v in sorted(exercises.items())],ensure_ascii=False,indent=2)+'\n')
lines=['# Постраничный указатель','', '144 документа; номер в первом столбце — PDF-страница. Полные условия, ответы, описание рисунков и интерактивные требования находятся по ссылке. Начало работы: [README](README.md), [общая структура](STRUCTURE.md).','', '| Страница | Раздел / тема | Задания | PNG-фрагментов |','|---|---|---|---|']
for r in records:
 lines.append(f"| [{r['pdfPage']:03}]({r['document']}) | {r['section'].replace('|',' / ')} — {r['topic'].replace('|',' / ')} | {r['exerciseLabel'].replace('|',' / ')} | {len(r['assetIds'])} |")
(ROOT/'PAGE_INDEX.md').write_text('\n'.join(lines)+'\n')
lines=['# Реестр изображений','', 'Каждый файл — вырезка из страницы. Координаты `(x0,y0,x1,y1)` в пикселях PNG, правая и нижняя границы исключающие. Точный машиночитаемый реестр: [assets.json](data/assets.json).','']
assets=json.loads((ROOT/'data/assets.json').read_text())
for r in records:
 group=[a for a in assets if a['page']==r['pdfPage']]
 if not group:continue
 lines+= [f"## Страница {r['pdfPage']:03}",'',f"[Описание]({r['document']}) · [Скан]({r['scan']})",'','| Изображение | Размер | Координаты | Описание |','|---|---|---|---|']
 for a in group:
  desc=re.sub(r'\[([^\]]+)\]\([^)]*\)',r'\1',a['description']).replace('|',' / ')
  lines.append(f"| [{a['id']}]({a['path']}) | {a['width']}×{a['height']} | {a['bbox']} | {desc} |")
 lines+=['']
(ROOT/'ASSET_INDEX.md').write_text('\n'.join(lines)+'\n')
print(json.dumps(dict(pages=len(records),exerciseNumbers=len(exercises),missing=[x for x in range(1,893) if x not in exercises],assets=len(assets))))
