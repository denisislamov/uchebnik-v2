"""Explicit editorial mappings for non-formula tasks. All lengths are virtual models."""
import re
OV={}
def work(n, pairs, prompt=None):
 OV[n]={'kind':'work','fields':[{'id':f'q{i+1}','label':str(label),'expected':str(value)} for i,(label,value) in enumerate(pairs)]}
 if prompt:OV[n]['prompt']=prompt

def activity(n,mode,targets,**kwargs):OV[n]={'kind':'activity','activity':dict(mode=mode,targets=list(targets),**kwargs)}
def seq(n,values):activity(n,'sequence',values)
def place(n,values):activity(n,'place',values)
# Number formation, counting, reading and missing entries.
for n,values in {201:[16],202:[14],203:[15,18,19,20],204:[15,19,20],205:list(range(11,21)),206:[11,13,16,18,19],722:[100],725:[55,88],727:[54],732:[35]}.items():place(n,values)
for n,values in {208:[13,15,16,19,20],209:list(range(1,21)),210:[12,14,16,17,19],734:[35,68,46,92],736:[30,40,70,90,49],738:[57,30,40,70,90],740:[43,48,49]}.items():
 labels={208:['тринадцать','пятнадцать','шестнадцать','девятнадцать','двадцать'],734:['тридцать пять','шестьдесят восемь','сорок шесть','девяносто два'],736:['тридцать','сорок','семьдесят','девяносто','сорок девять'],738:['После 56','После 29','После 39','После 69','После 89']}.get(n)
 work(n,[(labels[i] if labels else f'Число на месте {i+1}',v) for i,v in enumerate(values)])
for n,vals in {258:list(range(2,21,2))+list(range(5,21,5)),409:list(range(3,19,3))+list(range(4,21,4)),435:list(range(18,-1,-3))+list(range(20,-1,-5)),512:list(range(3,19,3))+list(range(6,19,6)),519:list(range(2,21,2))+list(range(4,21,4))+list(range(3,19,3)),520:list(range(2,21,2)),535:list(range(3,19,3)),553:list(range(4,21,4)),758:list(range(10,101,10))+list(range(20,101,20)),776:list(range(100,-1,-10)),733:[27,43,78,56,92,84,61,36,54,71,99,44,68,87,22,63],737:[36,40,63,80,92],739:list(range(5,96,10))+list(range(3,84,20))}.items():seq(n,vals)
work(735,[(f'Сколько десятков в {n}?',n//10) for n in [30,60,40,70,90]])
work(37,[('Сколько всего цветов?',8),('Сколько цветов осталось?',6)])
work(185,[('Сколько метров осталось?',2),('Сколько метров стало?',7)])
work(321,[('Птиц на первом проводе',5),('Птиц осталось на втором проводе',4),('На сколько меньше?',1)])
work(415,[('Сколько палочек осталось?',9)])
work(515,[('Сколько книг у сестры?',9),('Сколько книг у брата и сестры вместе?',20)],'У брата 11 книг, у сестры на 2 меньше. Ответь сначала на вопрос в одно действие, потом — в два.')
activity(39,'composition',[3])
for n,targets in {638:[3,6,9,12,15,18],654:[4,8,12,16,20],672:[5,10,15,20]}.items():activity(n,'groups',targets,groups={638:3,654:4,672:5}[n])
for n,targets in {731:[42,65,93],604:[15,20],804:[50,80,100]}.items():activity(n,'coins',targets,denominations=[1,2,3,5,10,15,20],unit='копеек')
# Physical actions adapted as explicitly labelled virtual experiments.
for n,targets in {171:[8,4],172:[3,5],173:[1,6,4],174:[3,2],175:[5,3],747:[1,5,9],748:list(range(10,101,10)),749:list(range(15,96,10))+[100],750:[4],751:[8,5],752:[10],753:[9,4]}.items():
 activity(n,'ruler',targets,unit='м' if n<200 else 'см')
 OV[n]['prompt']=f'Учебная модель к заданию № {n}. '+({171:'Измерь длину и ширину виртуальной комнаты.',172:'Отмерь две ленты.',173:'Собери метровую мерку и измерь комнату в модели.',174:'Отмерь 3 м, затем покажи длину после отрезания 1 м.',175:'Отмерь 5 м, затем покажи длину после отрезания 2 м.',750:'Измерь отрезок. В модели его длина задана как 4 см.',751:'Измерь стороны модельной тетради.',753:'Измерь модельные платье и рукав.'}.get(n,'Выбери нужные отметки на линейке.'))+' Размеры модели не являются размерами настоящих предметов.'
for n,targets in {457:[1,1],459:[2,3]}.items():activity(n,'balance',targets,unit='кг')
activity(491,'liquid',[1000],unit='мл');OV[491]['prompt']='Налей литр воды стаканами. В нашей модели стакан вмещает 200 мл. Посчитай, сколько стаканов понадобится.'
activity(492,'liquid',[1,2,3],unit='л')
seq(741,[2,4,6,8,10,1,3,5,7,9]);OV[741]['prompt']='Прогуляемся по вымышленной улице. С одной стороны дома 2, 4, 6, 8, 10, с другой — 1, 3, 5, 7, 9. Найди их по порядку.'
# Frame operands and decompositions, one field per printed item.
FRAMES={17:[f'{n}−1−1' for n in [4,8,6,10]]+[f'{n}−2' for n in [4,6,8,10]],28:[f'{n}−1−1' for n in [3,7,5,9]]+[f'{n}−2' for n in [3,5,7,9]],183:[f'{n}+4' for n in [4,6,3,5]]+[f'{n}−4' for n in [6,9,7,10]]+[f'{n}+5' for n in [3,5,2,4]]+[f'{n}−5' for n in [10,8,7,9]],190:[f'{n}+6' for n in [3,2,4]]+[f'{n}−6' for n in [10,7,9]]+[f'{n}+7' for n in [1,3,2]]+[f'{n}−7' for n in [9,8,7]],392:[f'8+{n}' for n in [4,8,6,5,9,7]],401:['4+7','3+8'],408:[f'3+{n}' for n in [5,7,8,9,6,10,12,15,13]],571:['5+5','5+5+5','5+5+5+5','5×2','5×3','5×4'],784:[f'{a}−{b}' for a in [70,100] for b in [20,40,10,30]]+[f'30+{n}' for n in [20,50,40,70]]}
# Both image-based construction and arithmetic belong to these tasks.
work(554,[('Палочек для 3 отдельных квадратов',12),('Палочек для 5 отдельных квадратов',20)])
work(561,[('Примеров решил Володя',12),('Примеров решил Вася',14)])
work(892,[('Очки Серёжи',70),('Очки Гали',100)])
OV[892]['fields'].append({'id':'winner','label':'Кто выиграл?','expected':'Галя','options':['Серёжа','Галя','Ничья']})
# Open tasks that depend on a previous example use an explicit formula template.
FORMULAS={278:'a+b',280:'a+b',293:'a+b',296:'a+b',335:'a-b',337:'a-b',349:'a-b',411:'a+(a+b)',488:'a-(b+c)',563:'a*b+c',581:'a*b+c',645:'(a-b)/3',707:'a+(a+b)',715:'a*b/c',720:'(a+b)/c',770:'a+(a+b)',811:'a-b*c',851:'a*b+c',853:'a+b',875:'a+b',883:'(a+b)/c'}
