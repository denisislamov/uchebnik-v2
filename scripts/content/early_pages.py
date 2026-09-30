"""Interaction inventory for unnumbered exercises on PDF pages 11–29."""
import re
def build(assets, calc):
 pages={p:[] for p in range(11,30)}
 MISSING='Найди число, которого не хватает.'
 serial={p:0 for p in pages}
 def add(p,kind,title,prompt='',images=None,**kw):
  serial[p]+=1
  b=dict(id=f'p{p:03}-lesson{serial[p]:02}',kind=kind,title=title,prompt=prompt or title,images=[f'p{p:03}_{x}' for x in images or []],**kw);pages[p].append(b);return b
 # Review 2: the heading names the step, the prompt says what to do, every field asks a question.
 def work(p,title,qs,images=None,prompt=''):return add(p,'work',title,prompt,images=images,fields=[dict(id=f'q{i+1}',label=q,expected=str(v)) for i,(q,v) in enumerate(qs)])
 def act(p,title,mode,targets,images=None,prompt='',**kw):
  if mode=='place':kw['token']='circle' if 'круж' in prompt+title else 'stick'
  return add(p,'activity',title,prompt,images=images,activity=dict(mode='count' if mode=='place' else mode,targets=targets,**kw))
 def draw(p,title,plan,images=None):return add(p,'trace',title,images=images,plan=plan)
 def sums(p,es):
  signs={'сложение' if '+' in e else 'вычитание' for e in es}
  return work(p,'Примеры на '+signs.pop() if len(signs)==1 else 'Примеры',[(e+' =',calc(e)) for e in es],prompt='Реши примеры и запиши ответы.')
 def split(p,n,images=None,objects=False):
  if objects:
   names,object_label,containers,container,token={19:('пряников','пряники','2 блюдца','блюдце','circle'),23:('яблок','яблоки','2 тарелки','тарелка','circle'),25:('карандашей','карандаши','2 коробки','коробка','stick'),27:('грибов','грибы','2 кучки','кучка','circle'),29:('орехов','орехи','2 блюдца','блюдце','circle')}[p]
   act(p,{19:'Пряники на блюдцах',23:'Яблоки на тарелках',25:'Карандаши в коробках',27:'Грибы в кучках',29:'Орехи на блюдцах'}[p],'composition',[n],prompt=f'Как можно разложить {n} {names} {"в" if p==25 else "на"} {containers}?',token=token,objectLabel=object_label,groupLabels=[f'Первое {container}' if container=='блюдце' else f'Первая {container}',f'Второе {container}' if container=='блюдце' else f'Вторая {container}'])
   # Retire the extra equation worksheet without renumbering later saved IDs.
   serial[p]+=1
   return
  parts={3:[2,1],4:[2,2],5:[4,1],6:[4,2],7:[4,3],8:[7,1],9:[8,1],10:[5,5]}[n]
  token,names=('stick','палочек') if p==25 else ('circle','кружков') if p==27 else ('square','квадратика' if n in [3,4] else 'квадратиков')
  colors=['red','green'] if p in [15,25,27] else ['green','red']
  patterns={3:[[0,0],[0,1],[1,1]],4:[[0,0],[0,1],[1,0],[1,1]],5:[[0,0],[1,0],[0,1],[1,1],[3,1]],6:[[0,0],[1,0],[0,1],[1,1],[3,0],[3,1]],7:[[0,0],[1,0],[0,1],[1,1],[3,0],[4,0],[3,1]],10:[[0,0],[2,0],[1,1],[0,2],[2,2],[4,0],[6,0],[5,1],[4,2],[6,2]]}
  copied=act(p,f'Состав числа {n}','composition',[n],images,prompt=f'Разложи {n} {names} так: {parts[0]} и {parts[1]}.',token=token,fixedParts=parts,partColors=colors)
  if n in patterns:copied['activity']['compositionPattern']=patterns[n]
  act(p,f'Число {n} по-другому','composition',[n],prompt=f'Как ещё можно разложить {n} {names}?',token=token,differentFrom=parts,partColors=colors)
 def more(p,n):
  first=f'{n-1} {"палочки" if n-1 in [2,3,4] else "палочек"}'
  # Both actions in one sentence above the steps read as a single muddled task.
  return add(p,'practical',f'{first.capitalize()} и ещё одна','Сделай по порядку два шага. Потом ответь, сколько стало палочек.',steps=[dict(id='first',instruction=f'Положи {first}.',mode='place',token='stick',counts=[n-1]),dict(id='more',instruction='Положи ещё 1 палочку.',mode='place',token='stick',counts=[n],carryFrom='first')],fields=[dict(id='q1',label='Сколько стало палочек?',expected=str(n))])
 def example(p,title,body,images=None):return add(p,'read',title,images=images,body=body)
 def examples(p,es,images=None):return example(p,'Рассмотри образцы', '\n'.join(f'{e} = {calc(e)}' for e in es),images)
 def coins(p,n):act(p,'Монеты','coins',[n],prompt=f'Набери {n} копеек.',denominations=[v for v in [1,2,3,5,10] if v<=n],unit='копеек')
 def count(p,n):
  act(p,'Счёт по порядку','sequence',list(range(1,n+1)),prompt=f'Считай от 1 до {n}.')
  act(p,'Обратный счёт','sequence',list(range(n,0,-1)),prompt=f'Считай от {n} до 1.')
 def digit(p,n,img):draw(p,f'Число {n}' if n>9 else f'Цифра {n}',f'digit:{n}',[img])['prompt']=f'Напиши число {n} по клеткам.' if n>9 else f'Напиши цифру {n} по клеткам.'
 def fruit(p,n,shape,img=None):
  names={'flag':'флажка','apple':'яблок','cherry':'вишен','ball':'шаров','tree':'ёлочек','mushroom':'грибов'}
  draw(p,{'flag':'Флажки','apple':'Яблоки','cherry':'Вишни','ball':'Шары','tree':'Ёлочки','mushroom':'Грибы'}[shape],f'{shape}:{n}',[img] if img else [])['prompt']=f'Нарисуй {n} {names[shape]} и подпиши под рисунком {n}.'
 def shape(p,title,prompt,shapes,img):add(p,'construction',title,prompt,images=[img],shapes=shapes)
 b=work(11,'Дети на велосипедах',[('Сколько всего детей катается?',3),('Сколько всего колёс у детского велосипеда?',3)],['children_tricycles'])
 b['prompt']='2 мальчика и 1 девочка катаются на велосипедах. Сколько всего детей катается?\n\nУ детского велосипеда спереди 1 колесо, сзади 2. Сколько всего колёс у детского велосипеда?'
 b['sourceText']=b['prompt']
 split(11,3,['three_squares_2_1'])
 coins(11,3);pages[11][-1]['prompt']='Из каких монет можно составить 3 копейки? Набери 3 копейки из монет разрезной таблицы.'
 act(11,'Два шага','sequence',[1,2],prompt='Сделай 2 шага вперёд.')
 # One picture to a step, and every question shows on it what it asks about: a list of
 # questions about several pictures at once was more than a child could take in (review 3).
 # `shots` are (picture, [(question, answer, outlines)]); an outline is the centre and the two
 # radii of a thing as shares of the picture. The first step keeps the old ID; the others get
 # `ids` and take no number from the steps after them.
 ORDINAL=['первая','вторая','третья','четвёртая']
 def per_picture(p,title,prompt,shots,ids,names=None):
  made=[]
  for k,(image,qs) in enumerate(shots):
   name=names[k] if names else f'{title}: {ORDINAL[k]} картинка'
   b=work(p,name,[(q,v) for q,v,_ in qs],[image],prompt=prompt if isinstance(prompt,str) else prompt[k])
   for f,(_,_,shapes) in zip(b['fields'],qs):f['marks']=dict(image=f'p{p:03}_{image}',shapes=shapes)
   if k:b['id']=ids[k-1];serial[p]-=1
   made.append(b)
  return made
 def sides3(noun,left,right):
  # Left, right and all: the outlines of «всего» are both.
  return [(f'Сколько {noun} слева?',len(left),left),(f'Сколько {noun} справа?',len(right),right),(f'Сколько {noun} всего?',len(left)+len(right),left+right)]
 # Each ball: the centre and the two radii of its outline, as shares of the picture.
 per_picture(11,'Мячи','Посчитай мячи на картинке.',[
  ('balls_left_2_and_1',sides3('мячей',[[0.215,0.27,0.15,0.28],[0.36,0.62,0.15,0.28]],[[0.80,0.60,0.15,0.28]])),
  ('balls_right_1_and_2',sides3('мячей',[[0.16,0.57,0.135,0.36]],[[0.585,0.56,0.135,0.36],[0.79,0.31,0.135,0.33]]))],['p011-balls-right'])
 walk=act(11,'Три шага','sequence',[1,2,3],prompt='Сделай 3 шага вперёд.');pages[11].remove(walk);walk['id']='p011-walk-three';pages[11].insert(5,walk)
 lines=draw(11,'Клетки по образцу','cells:1,2h,3h,3v,2v,1',['writing_strip_squares_rects']);lines['id']='p011-lesson07';lines['prompt']='Обведи клетки, как на образце: сначала всю фигуру, потом линии между клетками.'
 work(12,'Число четыре',[('Сколько детей?',4),('Сколько жетонов на карточке?',4),('Сколько точек на карточке?',4)],['children_woodwork_table','abacus_4','domino_4'],prompt='Посчитай детей, жетоны и точки.')
 digit(12,4,'digit_4_sample');shape(12,'Квадрат из палочек','Сложи квадрат из четырёх палочек.',['square'],'sticks_square')
 more(12,4);add(12,'practical','Ножки мебели','Сколько ножек у стола и у табуретки на картинке?',images=['children_woodwork_table'],steps=[dict(id='table',instruction='Покажи столько палочек, сколько ножек у стола.',mode='place',token='stick',counts=[4]),dict(id='chair',instruction='Покажи столько палочек, сколько ножек у табуретки.',mode='place',token='stick',counts=[4])],fields=[])
 fruit(12,4,'flag','flags_draw_sample')
 seq_prompt='Смотри на картинки по порядку: сначала левая, потом правая.'
 work(13,'Птички на ветке',[('Сколько птичек сидело на ветке?',4),('Одна улетела. Сколько осталось?',3)],['birds_four_on_branch','birds_one_flies_away'])['prompt']=seq_prompt
 work(13,'Ноги, колёса и крылья',[('Сколько ног у козочки?',4),('Сколько всего колёс у машины? Считай и те, что с другой стороны.',4),('Сколько крыльев у бабочки?',4)],['goat','truck','butterfly'],prompt='Сосчитай и запиши число.')
 split(13,4,['squares_2_2'])
 sides=lambda thing,i:[f'Картинка {i}. Сколько {thing} слева?',f'Картинка {i}. Сколько {thing} справа?',f'Сколько всего {thing} на картинке {i}?']
 per_picture(13,'Сливы','Посчитай сливы на картинке.',[
  ('plums_frame_1',sides3('слив',[[0.14,0.65,0.085,0.17],[0.30,0.69,0.085,0.17],[0.45,0.56,0.085,0.17]],[[0.80,0.65,0.09,0.17]])),
  ('plums_frame_2',sides3('слив',[[0.17,0.75,0.09,0.17],[0.30,0.67,0.085,0.17]],[[0.66,0.70,0.085,0.17],[0.80,0.66,0.085,0.17]])),
  ('plums_frame_3',sides3('слив',[[0.19,0.64,0.095,0.19]],[[0.52,0.70,0.08,0.17],[0.66,0.71,0.08,0.17],[0.80,0.62,0.085,0.19]]))],['p013-plums-2','p013-plums-3'])
 work(13,'Колёса и ноги',[('Сколько колёс у автомобиля?',4),('Сколько ног у коровы?',4),('Сколько ног у петуха?',2),('Сколько ног у собаки?',4)],prompt='Сколько? Запиши цифрой.')
 work(14,'Число пять',[('Сколько всего мальчиков?',5),('Сколько мальчиков стоит в очереди?',4),('Сколько звёзд?',5),('Сколько лепестков у цветка?',5)],['boys_queue','five_stars','apple_blossom'],prompt='Посчитай и запиши число.')
 digit(14,5,'digit_5_sample');more(14,5);act(14,'Концы звезды','place',[5],['star_outline'],prompt='Положи столько палочек, сколько концов у звезды.');fruit(14,5,'apple','apples_draw')
 work(15,'Девочка и ромашки',[('Сколько ромашек росло?',5),('Одну сорвали. Сколько осталось?',4)],['girl_daisies_1','girl_daisies_2'])['prompt']=seq_prompt
 split(15,5,['squares_4_1']);coins(15,5)
 nut=lambda x,y:[x,y,0.11,0.14]
 per_picture(15,'Орехи','Посчитай орехи на картинке.',[
  ('nuts_frame_1',sides3('орехов',[nut(0.17,0.40),nut(0.34,0.30),nut(0.24,0.68)],[nut(0.63,0.47),nut(0.72,0.72)])),
  ('nuts_frame_2',sides3('орехов',[nut(0.16,0.40),nut(0.36,0.28)],[nut(0.72,0.45),nut(0.55,0.72),nut(0.78,0.72)])),
  ('nuts_frame_3',sides3('орехов',[nut(0.28,0.25),nut(0.18,0.50),nut(0.40,0.43),nut(0.30,0.72)],[nut(0.78,0.62)])),
  ('nuts_frame_4',sides3('орехов',[nut(0.25,0.75)],[nut(0.47,0.35),nut(0.73,0.25),nut(0.52,0.57),nut(0.73,0.74)]))],['p015-nuts-2','p015-nuts-3','p015-nuts-4'])
 work(15,'Пальцы, лапы и ноги',[('Сколько пальцев на руке?',5),('Сколько лап у кошки?',4),('Сколько ног у курицы?',2)],prompt='Сколько? Запиши цифрой.')
 work(15,'Орехи в столбиках',[(f'Сколько орехов в столбике {i}?',i) for i in range(1,6)],['nuts_columns_1_5'],prompt='Посчитай орехи в каждом столбике.')
 for n,img in [(1,'two_dolls'),(2,'three_puppies'),(3,'four_goats'),(4,'five_kittens')]:example(16,'Прибавляем один',f'{n} + 1 = {n+1}',[img,f'cards_{n}_plus_1_eq_{n+1}'])
 work(16,'Примеры на сложение',[(f'{n} + 1 =',n+1) for n in [1,2,3,4]],[f'cards_{n}_plus_1_blank' for n in [1,2,3,4]],prompt='Реши примеры и запиши ответы.')
 work(17,'Кролики',[('Сколько белых кроликов?',3),('Сколько чёрных кроликов?',1),('Сколько всего кроликов?',4)],['rabbits'],prompt='Посчитай кроликов.')
 work(17,'Морковки',[('Сколько морковок слева?',4),('Сколько морковок справа?',1),('Сколько всего морковок?',5)],['carrots'],prompt='Посчитай морковки.')
 examples(17,['1+1','2+1','3+1','4+1'],[a['id'][5:] for a in assets if a['page']==17 and ('circles_' in a['id'] or 'writing' in a['id'] or 'handwritten' in a['id'])]);sums(17,['4+1','3+1','2+1','1+1','3+1','4+1'])
 white=[[0.12,0.60,0.10,0.15],[0.27,0.72,0.11,0.17],[0.50,0.66,0.055,0.14],[0.63,0.58,0.08,0.11],[0.86,0.73,0.12,0.15]];dark=[[0.70,0.73,0.10,0.17]]
 cherry=lambda x,y:[x,y,0.055,0.14]
 # The beetle's legs are counted by the step that lays a circle for each of them.
 per_picture(18,'Число шесть',['Посчитай кур на картинке.','Посчитай вишни на ветке.'],[
  ('girl_feeding_chickens',[('Сколько белых кур?',5,white),('Сколько тёмных кур?',1,dark),('Сколько всего кур?',6,white+dark)]),
  ('cherries_branch',sides3('вишен',[cherry(0.27,0.68),cherry(0.36,0.73),cherry(0.43,0.63)],[cherry(0.71,0.68),cherry(0.80,0.72),cherry(0.89,0.62)]))],['p018-cherry-branch'],names=['Куры','Вишни: слева и справа'])
 legs=act(18,'Ноги жука','place',[6],['beetle'],groupLabels=['Ноги жука']);legs['prompt']='Положи столько кружков, сколько ног у жука.';legs['activity']['token']='circle'
 cherries=act(18,'Вишни на ветке','place',[6],['cherries_branch'],groupLabels=['Вишни на ветке']);cherries['prompt']='Положи столько кружков, сколько вишен на ветке.';cherries['activity']['token']='circle';cherries['id']='p018-cherries';serial[18]-=1
 # The cherries are counted, then a circle is laid for each: the two steps stand together.
 counted=next(b for b in pages[18] if b['id']=='p018-cherry-branch');pages[18].remove(counted);pages[18].insert(pages[18].index(cherries),counted)
 digit(18,6,'digit_6_sample')
 shape(18,'Дом из палочек','Сложи дом из шести палочек.',['house'],'sticks_house');shape(18,'Два треугольника','Сложи два треугольника из палочек.',['triangle','triangle'],'sticks_two_triangles')
 more(18,6);fruit(18,6,'cherry')
 work(19,'Прибавим один',[('Мальчик добавил в аквариум одну рыбку. Сколько стало рыбок?',5),('Девочка поставила ещё один цветок. Сколько стало цветов?',6)],['boy_aquarium','girl_flowerpots'],prompt='Посмотри на картинки и ответь на вопросы.')
 split(19,6,['squares_4_2']);coins(19,6)
 dot=lambda x,y:[x,y,0.07,0.12]
 per_picture(19,'Домино','Посчитай точки на костяшке.',[
  ('domino_5_1',[('Сколько точек слева?',5,[dot(0.13,0.28),dot(0.39,0.28),dot(0.27,0.48),dot(0.13,0.70),dot(0.39,0.70)]),('Сколько точек справа?',1,[dot(0.67,0.48)])]),
  ('domino_4_2',[('Сколько точек слева?',4,[dot(0.13,0.28),dot(0.39,0.28),dot(0.13,0.70),dot(0.39,0.70)]),('Сколько точек справа?',2,[dot(0.81,0.28),dot(0.56,0.70)])]),
  ('domino_3_3',[('Сколько точек слева?',3,[dot(0.37,0.25),dot(0.24,0.48),dot(0.11,0.70)]),('Сколько точек справа?',3,[dot(0.80,0.25),dot(0.66,0.48),dot(0.53,0.70)])])],['p019-domino-2','p019-domino-3'],names=['Домино: первая костяшка','Домино: вторая костяшка','Домино: третья костяшка'])
 split(19,6,objects=True);gaps=work(19,'Каких чисел не хватает?',[('Какое число после 1?',2),('Какое число перед 4?',3),('Какое число между 4 и 6?',5)]);gaps['prompt']='Каких чисел не хватает в ряду 1, □, □, 4, □, 6?';count(19,6);sums(19,['3+1','5+1','1+1','4+1','2+1','5+1'])
 # Three stories, three pictures: one step each, so it is clear which sum belongs to which picture.
 example(20,'Шарик улетел','Было 2 шарика. Один улетел, остался 1.\n2 − 1 = 1',['girl_two_balloons','girl_balloon_flies','cards_2_minus_1'])
 for id,title,body,images in [('p020-gave-one','Один отдали','Было 3 предмета. Один отдали, осталось 2.\n3 − 1 = 2',['boys_giving_object','cards_3_minus_1']),('p020-picked-one','Помидор сорвали','Было 4 помидора. Один сорвали, осталось 3.\n4 − 1 = 3',['girl_picking_tomato','cards_4_minus_1'])]:
  example(20,title,body,images)['id']=id;serial[20]-=1
 example(21,'Белка и шишки','Было 5 шишек. Белка взяла одну. Осталось 4 шишки: 5 − 1 = 4.',['five_cones','squirrel_takes_cone','cards_5_minus_1'])
 examples(21,['2−1','3−1','4−1','5−1','6−1'],[a['id'][5:] for a in assets if a['page']==21 and ('circles_' in a['id'] or 'writing' in a['id'] or 'handwritten' in a['id'])]);sums(21,['5−1','3−1','6−1','4−1','2−1','5−1','6−1','4−1','3−1'])
 work(22,'Число семь',[('Сколько всего деревьев?',7),('Сколько орехов?',7),('Сколько яблок?',7)],['children_planting_seven_trees','seven_walnuts','seven_apples'],prompt='Посчитай деревья, орехи и яблоки.')
 add(22,'practical','Клетки для орехов и яблок','Обведи столько клеток, сколько нарисовано орехов; сколько в вазе яблок.',images=['seven_walnuts','seven_apples'],steps=[dict(id='cells',instruction='Сосчитай орехи и яблоки. Выбери количество клеток для каждого рисунка, затем обведи два ряда.',mode='draw',token='square',counts=[7,7],chooseCounts=[0,1],groupLabels=['Орехи','Яблоки'],grid=dict(columns=10,rows=5))],fields=[]);digit(22,7,'digit_7_sample');shape(22,'Квадрат и треугольник','Сложи квадрат и треугольник из палочек.',['square','triangle'],'sticks_square_triangle');more(22,7);fruit(22,7,'apple')
 work(23,'Листья и груши',[('6 кленовых листьев и 1 дубовый. Сколько всего листьев?',7),('Было 7 груш, одну сорвали. Сколько осталось?',6)],['seven_leaves','boy_picking_pear'],prompt='Реши задачи по картинкам.')
 split(23,7,['squares_4_3']);work(23,'Части на домино',[(f'{a} + □ = 7',7-a) for a in [6,5,4]],['domino_6_1','domino_5_2','domino_4_3'],prompt=MISSING);split(23,7,objects=True);coins(23,7);count(23,7);sums(23,['4+1','7−1','3−1','5+1','6−1','3+1','6+1','5−1','5−1'])
 work(24,'Число восемь',[('Сколько всего голубей?',8),('Сколько горошин?',8),('Сколько ягод смородины?',8)],['eight_pigeons','eight_peas','eight_currants'],prompt='Посчитай голубей, горошины и ягоды.');act(24,'Ягоды смородины','place',[8],['eight_currants'],prompt='Положи столько кружков, сколько ягод на ветке смородины.',groupLabels=['Ягоды смородины']);digit(24,8,'digit_8_sample');shape(24,'Два квадрата','Сложи два квадрата из палочек.',['square','square'],'sticks_two_squares');more(24,8);fruit(24,8,'ball')
 for p,n in [(25,8),(27,9)]:
  if p==25:work(p,'Книги',[('Было 7 книг и ещё одна. Сколько всего книг?',8),('Из 8 книг взяли одну. Сколько осталось?',7)],['girl_reads_book','girl_takes_book'],prompt='Реши задачи по картинкам.')
  else:work(p,'Свиньи и утки',[('Сколько белых свиней?',8),('Сколько чёрных свиней?',1),('Сколько всего свиней?',9),('Было 9 уток, одна вышла на берег. Сколько осталось на воде?',8)],['pigs_grazing','ducks_pond'],prompt='Посчитай свиней и уток.')
  work(p,'Задачи',prompt='Реши задачи.',qs=[('Сеня вырезал 8 кружков, а потом ещё 1 кружок. Сколько всего кружков вырезал Сеня?',9),('9 мальчиков играли в жмурки. Один мальчик вышел из игры. Сколько мальчиков продолжало игру?',8)] if p==27 else [('Костя научился писать 7 цифр, а потом ещё 1 цифру. Сколько всего цифр он научился писать?',8),('У Юры было 8 голубей. 1 голубь улетел. Сколько голубей осталось у Юры?',7)])
  split(p,n);work(p,'Части на домино',[(f'{a} + □ = {n}',n-a) for a in range(n-1,(n-1)//2,-1)],[f'domino_{n}_{a}_{n-a}' for a in range(n-1,(n-1)//2,-1)],prompt=MISSING);split(p,n,objects=True);coins(p,n);count(p,n)
  sums(p,['5+1','6+1','7+1','8−1','7−1','6−1','5−1','4−1','4+1'] if p==25 else ['4+1','6+1','8+1','9−1','8−1','7−1','5−1','5+1','4−1'])
 work(26,'Число девять',[('Сколько пионеров?',9),('Сколько роз?',9),('Сколько связок флажков?',3),('Сколько флажков в каждой связке?',3),('Сколько всего флажков?',9)],['pioneers_marching','roses_vase','flags_9'],prompt='Посчитай пионеров, розы и флажки.');digit(26,9,'digit_9_sample');shape(26,'Три треугольника','Сложи три треугольника из палочек.',['triangle']*3,'sticks_triangles');more(26,9);fruit(26,9,'tree');gaps=work(26,'Каких чисел не хватает?',[('Какое число после 2?',3),('Какое число между 6 и 8?',7),('Какое число после 8?',9)]);gaps['prompt']='Каких чисел не хватает в ряду 1, 2, □, 4, 5, 6, □, 8, □?'
 work(28,'Число десять',[('Сколько детей делают зарядку?',9),('Сколько всего людей вместе с инструктором?',10)],['kids_gymnastics'],prompt='Посчитай людей на картинке.');shape(28,'Звезда из палочек','Сложи звезду из десяти палочек.',['star'],'sticks_star');digit(28,10,'digit_10_sample');work(28,'Грибы и карандаши',prompt='Реши задачи.',qs=[('Лена нарисовала 9 маленьких грибов и 1 большой гриб. Сколько всего грибов нарисовала Лена?',10),('В коробке было 10 цветных карандашей. Мальчик взял 1 карандаш. Сколько карандашей осталось в коробке?',9)]);fruit(28,10,'mushroom');work(28,'Каких чисел не хватает?',[(f'Какое число между {v-1} и {v+1}?',v) for v in [3,5,7,9]],prompt='Каких чисел не хватает в ряду 1, 2, □, 4, □, 6, □, 8, □, 10?')
 work(29,'Игрушечный поезд',[('Было 9 вагонов и ещё один. Сколько всего вагонов?',10)],['boy_toy_train'],prompt='Реши задачу по картинке.');split(29,10,['squares_green_red']);work(29,'Состав десяти',[(f'{a} + □ = 10',10-a) for a in [9,8,7,6,5]],['bars_10_all'],prompt=MISSING);split(29,10,objects=True);coins(29,10);count(29,10)
 # Attach source illustrations to the corresponding activity, never a catch-all opening lesson.
 for p,blocks in pages.items():
  used={x for b in blocks for x in b['images']}
  missing=[a['id'] for a in assets if a['page']==p and a['id'] not in used]
  for image in missing:
   suffix=image[5:]
   # The row with both sets of balls is the same balls once more: it is kept with the first of the two steps and not shown.
   if p==11: dest=next(b for b in blocks if b['id']=='p011-lesson06')
   elif re.search(r'^digit_|^abacus_|^domino_|^dots_|green_dots|green_circles|^circles_[56]$|^coin_',suffix):
    dest=next((b for b in blocks if b.get('plan','').startswith('digit:')),blocks[0])
   elif 'number_' in suffix:dest=next((b for b in blocks if 'не хватает' in b['title']),next((b for b in blocks if b.get('activity',{}).get('mode')=='sequence'),blocks[0]))
   # Split bars belong to the «Состав» worksheet; on «Разложи так: 5 и 5» five extra pictures buried the one that matters.
   elif 'bar_' in suffix:dest=next((b for b in blocks if b['kind']=='work' and b['title'].startswith('Состав')),next((b for b in blocks if b.get('activity',{}).get('mode')=='composition'),blocks[0]))
   else:
    # Completed sums are explanations. Keep them visible with their exercise.
    matches=[b for b in blocks if b['kind']=='work']
    dest=next((b for b in matches if any(suffix.replace('_eq_2','').replace('_eq_3','').replace('_eq_4','').replace('_eq_5','') in im for im in b['images'])),matches[-1] if matches else blocks[0])
   dest['images'].append(image)
 return pages
