"""Interaction inventory for unnumbered exercises on PDF pages 11–29."""
import re
def build(assets, calc):
 pages={p:[] for p in range(11,30)}
 serial={p:0 for p in pages}
 def add(p,kind,title,prompt='',images=None,**kw):
  serial[p]+=1
  b=dict(id=f'p{p:03}-lesson{serial[p]:02}',kind=kind,title=title,prompt=prompt or title,images=[f'p{p:03}_{x}' for x in images or []],**kw);pages[p].append(b);return b
 def work(p,title,qs,images=None):return add(p,'work',title,images=images,fields=[dict(id=f'q{i+1}',label=q,expected=str(v)) for i,(q,v) in enumerate(qs)])
 def act(p,title,mode,targets,images=None,**kw):
  if mode=='place':kw['token']='circle' if 'круж' in title else 'stick'
  return add(p,'activity',title,images=images,activity=dict(mode='count' if mode=='place' else mode,targets=targets,**kw))
 def draw(p,title,plan,images=None):return add(p,'trace',title,images=images,plan=plan)
 def sums(p,es):
  return work(p,'Реши каждый пример',[(e+' =',calc(e)) for e in es])
 def split(p,n,images=None,objects=False):
  if objects:
   names,object_label,containers,container,token={19:('пряников','пряники','2 блюдца','блюдце','circle'),23:('яблок','яблоки','2 тарелки','тарелка','circle'),25:('карандашей','карандаши','2 коробки','коробка','stick'),27:('грибов','грибы','2 кучки','кучка','circle'),29:('орехов','орехи','2 блюдца','блюдце','circle')}[p]
   act(p,f'Как можно разложить {n} {names} {"в" if p==25 else "на"} {containers}?','composition',[n],token=token,objectLabel=object_label,groupLabels=[f'Первое {container}' if container=='блюдце' else f'Первая {container}',f'Второе {container}' if container=='блюдце' else f'Вторая {container}'])
   # Retire the extra equation worksheet without renumbering later saved IDs.
   serial[p]+=1
   return
  parts={3:[2,1],4:[2,2],5:[4,1],6:[4,2],7:[4,3],8:[7,1],9:[8,1],10:[5,5]}[n]
  token,names=('stick','палочек') if p==25 else ('circle','кружков') if p==27 else ('square','квадратика' if n in [3,4] else 'квадратиков')
  colors=['red','green'] if p in [15,25,27] else ['green','red']
  patterns={3:[[0,0],[0,1],[1,1]],4:[[0,0],[0,1],[1,0],[1,1]],5:[[0,0],[1,0],[0,1],[1,1],[3,1]],6:[[0,0],[1,0],[0,1],[1,1],[3,0],[3,1]],7:[[0,0],[1,0],[0,1],[1,1],[3,0],[4,0],[3,1]],10:[[0,0],[2,0],[1,1],[0,2],[2,2],[4,0],[6,0],[5,1],[4,2],[6,2]]}
  copied=act(p,f'Разложи {n} {names} так: {parts[0]} и {parts[1]}.','composition',[n],images,token=token,fixedParts=parts,partColors=colors)
  if n in patterns:copied['activity']['compositionPattern']=patterns[n]
  act(p,f'Как ещё можно разложить {n} {names}?','composition',[n],token=token,differentFrom=parts,partColors=colors)
 def more(p,n):
  first=f'{n-1} {"палочки" if n-1 in [2,3,4] else "палочек"}'
  prompt=f'Положи {first} и ещё 1 палочку. Сколько стало палочек?'
  return add(p,'practical',prompt,steps=[dict(id='first',instruction=f'Положи {first}.',mode='place',token='stick',counts=[n-1]),dict(id='more',instruction='Положи ещё 1 палочку.',mode='place',token='stick',counts=[n],carryFrom='first')],fields=[dict(id='q1',label='Сколько стало палочек?',expected=str(n))])
 def example(p,title,body,images=None):return add(p,'read',title,images=images,body=body)
 def examples(p,es,images=None):return example(p,'Рассмотри образцы', '\n'.join(f'{e} = {calc(e)}' for e in es),images)
 def coins(p,n):act(p,f'Набери {n} копеек','coins',[n],denominations=[v for v in [1,2,3,5,10] if v<=n],unit='копеек')
 def count(p,n):
  act(p,f'Считай от 1 до {n}','sequence',list(range(1,n+1)))
  act(p,f'Считай от {n} до 1','sequence',list(range(n,0,-1)))
 def digit(p,n,img):draw(p,f'Напиши {n} по клеткам',f'digit:{n}',[img])
 def fruit(p,n,shape,img=None):
  names={'flag':'флажка','apple':'яблок','cherry':'вишен','ball':'шаров','tree':'ёлочек','mushroom':'грибов'}
  draw(p,f'Нарисуй {n} {names[shape]} и подпиши под рисунком {n}.',f'{shape}:{n}',[img] if img else [])
 def shape(p,title,shapes,img):add(p,'construction',title,images=[img],shapes=shapes)
 b=work(11,'Дети на велосипедах',[('Сколько всего детей катается?',3),('Сколько всего колёс у детского велосипеда?',3)],['children_tricycles'])
 b['prompt']='2 мальчика и 1 девочка катаются на велосипедах. Сколько всего детей катается?\n\nУ детского велосипеда спереди 1 колесо, сзади 2. Сколько всего колёс у детского велосипеда?'
 b['sourceText']=b['prompt']
 split(11,3,['three_squares_2_1'])
 coins(11,3);pages[11][-1]['prompt']='Из каких монет можно составить 3 копейки? Набери 3 копейки из монет разрезной таблицы.'
 act(11,'Сделай 2 шага вперёд.','sequence',[1,2])
 work(11,'Два набора мячей',[('В первой группе слева',2),('В первой группе справа',1),('Всего в первой группе',3),('Во второй группе слева',1),('Во второй группе справа',2),('Всего во второй группе',3)],['balls_left_2_and_1','balls_right_1_and_2'])
 walk=act(11,'Сделай 3 шага вперёд.','sequence',[1,2,3]);pages[11].remove(walk);walk['id']='p011-walk-three';pages[11].insert(5,walk)
 draw(11,'Обведи стороны клеток','cells:1,2h,3h,3v,2v,1',['writing_strip_squares_rects'])['id']='p011-lesson07'
 work(12,'Число четыре',[('Сколько детей?',4),('Жетонов на карточке',4),('Точек на карточке',4)],['children_woodwork_table','abacus_4','domino_4'])
 digit(12,4,'digit_4_sample');shape(12,'Сложи квадрат из четырёх палочек',['square'],'sticks_square')
 more(12,4);add(12,'practical','Ножки мебели','Покажи столько палочек, сколько ножек у стола, у стула.',steps=[dict(id='table',instruction='Покажи столько палочек, сколько ножек у стола.',mode='place',token='stick',counts=[4]),dict(id='chair',instruction='Покажи столько палочек, сколько ножек у стула.',mode='place',token='stick',counts=[4])],fields=[])
 fruit(12,4,'flag','flags_draw_sample')
 work(13,'Птички на ветке',[('Сидело на ветке',4),('Одна улетела. Сколько осталось?',3)],['birds_four_on_branch','birds_one_flies_away'])
 work(13,'Сосчитай',[('Ног у козочки',4),('Всего колёс у машины, включая другую сторону',4),('Крыльев у бабочки',4)],['goat','truck','butterfly'])
 split(13,4,['squares_2_2'])
 work(13,'Сливы в рамках',[(f'Рамка {i+1}: {side}',v) for i,pair in enumerate([(3,1),(2,2),(1,3)]) for side,v in zip(['слева','справа','всего'],[*pair,4])],['plums_frame_1','plums_frame_2','plums_frame_3'])
 work(13,'Запиши цифрами',[('Колёс у автомобиля',4),('Ног у коровы',4),('Ног у петуха',2),('Ног у собаки',4)])
 work(14,'Найди число пять',[('Всего мальчиков',5),('Мальчиков в очереди',4),('Звёзд',5),('Лепестков у цветка',5)],['boys_queue','five_stars','apple_blossom'])
 digit(14,5,'digit_5_sample');more(14,5);act(14,'Палочек столько, сколько концов у звезды','place',[5],['star_outline']);fruit(14,5,'apple','apples_draw')
 work(15,'Девочка и ромашки',[('Росло ромашек',5),('Одна сорвана. Сколько осталось?',4)],['girl_daisies_1','girl_daisies_2'])
 split(15,5,['squares_4_1']);coins(15,5)
 work(15,'Орехи в рамках',[(f'Рамка {i+1}: {side}',v) for i,pair in enumerate([(3,2),(2,3),(4,1),(1,4)]) for side,v in zip(['слева','справа','всего'],[*pair,5])],[f'nuts_frame_{i}' for i in range(1,5)])
 work(15,'Запиши цифрами',[('Пальцев на руке',5),('Лап у кошки',4),('Ног у курицы',2)])
 work(15,'Орехи в столбиках',[(f'Столбик {i}',i) for i in range(1,6)],['nuts_columns_1_5'])
 for n,img in [(1,'two_dolls'),(2,'three_puppies'),(3,'four_goats'),(4,'five_kittens')]:example(16,'Прибавляем один',f'{n} + 1 = {n+1}',[img,f'cards_{n}_plus_1_eq_{n+1}'])
 work(16,'Реши каждый пример',[(f'{n} + 1 =',n+1) for n in [1,2,3,4]],[f'cards_{n}_plus_1_blank' for n in [1,2,3,4]])
 work(17,'Кролики',[('Белых',3),('Чёрных',1),('Всего',4)],['rabbits'])
 work(17,'Морковки',[('Слева',4),('Справа',1),('Всего',5)],['carrots'])
 examples(17,['1+1','2+1','3+1','4+1'],[a['id'][5:] for a in assets if a['page']==17 and ('circles_' in a['id'] or 'writing' in a['id'] or 'handwritten' in a['id'])]);sums(17,['4+1','3+1','2+1','1+1','3+1','4+1'])
 work(18,'Число шесть',[('Белых кур',5),('Тёмных кур',1),('Всего кур',6),('Ног у жука',6),('Вишен слева',3),('Вишен справа',3),('Всего вишен',6)],['girl_feeding_chickens','beetle','cherries_branch'])
 act(18,'Положи столько кружков, сколько у жука ног; сколько нарисовано на ветке вишен.','place',[6,6],['beetle','cherries_branch'],groupLabels=['Ноги жука','Вишни на ветке']);digit(18,6,'digit_6_sample')
 shape(18,'Сложи дом из шести палочек',['house'],'sticks_house');shape(18,'Сложи два треугольника',['triangle','triangle'],'sticks_two_triangles')
 more(18,6);fruit(18,6,'cherry')
 work(19,'Прибавим один',[('Рыбок после добавления пятой',5),('Цветов после добавления шестого',6)],['boy_aquarium','girl_flowerpots'])
 split(19,6,['squares_4_2']);coins(19,6)
 work(19,'Домино',[(f'Костяшка {i+1}, {side}',v) for i,pair in enumerate([(5,1),(4,2),(3,3)]) for side,v in zip(['слева','справа'],pair)],['domino_5_1','domino_4_2','domino_3_3'])
 split(19,6,objects=True);work(19,'Каких чисел не хватает?',[('1, □, □, 4, □, 6: первый пропуск',2),('Второй пропуск',3),('Третий пропуск',5)]);count(19,6);sums(19,['3+1','5+1','1+1','4+1','2+1','5+1'])
 example(20,'Отнимаем один','Было 2 шарика. Один улетел, остался 1: 2 − 1 = 1.\nИз 3 предметов один отдали, осталось 2: 3 − 1 = 2.\nИз 4 помидоров один сорвали, осталось 3: 4 − 1 = 3.',[a['id'][5:] for a in assets if a['page']==20])
 example(21,'Белка и шишки','Было 5 шишек. Белка взяла одну. Осталось 4 шишки: 5 − 1 = 4.',['five_cones','squirrel_takes_cone','cards_5_minus_1'])
 examples(21,['2−1','3−1','4−1','5−1','6−1'],[a['id'][5:] for a in assets if a['page']==21 and ('circles_' in a['id'] or 'writing' in a['id'] or 'handwritten' in a['id'])]);sums(21,['5−1','3−1','6−1','4−1','2−1','5−1','6−1','4−1','3−1'])
 work(22,'Число семь',[('Всего деревьев',7),('Орехов',7),('Яблок',7)],['children_planting_seven_trees','seven_walnuts','seven_apples'])
 add(22,'practical','Обведи столько клеток, сколько нарисовано орехов; сколько в вазе яблок.',images=['seven_walnuts','seven_apples'],steps=[dict(id='cells',instruction='Сосчитай орехи и яблоки. Выбери количество клеток для каждого рисунка, затем обведи два ряда.',mode='draw',token='square',counts=[7,7],chooseCounts=[0,1],groupLabels=['Орехи','Яблоки'],grid=dict(columns=10,rows=5))],fields=[]);digit(22,7,'digit_7_sample');shape(22,'Сложи квадрат и треугольник',['square','triangle'],'sticks_square_triangle');more(22,7);fruit(22,7,'apple')
 work(23,'Листья и груши',[('6 кленовых листьев и 1 дубовый. Всего',7),('7 груш, одну сорвали. Осталось',6)],['seven_leaves','boy_picking_pear'])
 split(23,7,['squares_4_3']);work(23,'Части на домино',[(f'{a} + □ = 7',7-a) for a in [6,5,4]],['domino_6_1','domino_5_2','domino_4_3']);split(23,7,objects=True);coins(23,7);count(23,7);sums(23,['4+1','7−1','3−1','5+1','6−1','3+1','6+1','5−1','5−1'])
 work(24,'Число восемь',[('Всего голубей',8),('Горошин',8),('Ягод смородины',8)],['eight_pigeons','eight_peas','eight_currants']);act(24,'Положи столько кружков, сколько ягод на ветке смородины.','place',[8],['eight_currants'],groupLabels=['Ягоды смородины']);digit(24,8,'digit_8_sample');shape(24,'Два квадрата',['square','square'],'sticks_two_squares');more(24,8);fruit(24,8,'ball')
 for p,n in [(25,8),(27,9)]:
  if p==25:work(p,'Книги',[('7 книг и ещё одна. Всего',8),('Из 8 книг взяли одну. Осталось',7)],['girl_reads_book','girl_takes_book'])
  else:work(p,'Свиньи и утки',[('Белых свиней',8),('Чёрных',1),('Всего свиней',9),('9 уток, одна вышла на берег. На воде осталось',8)],['pigs_grazing','ducks_pond'])
  work(p,'Реши задачи',[('Сеня вырезал 8 кружков, а потом ещё 1 кружок. Сколько всего кружков вырезал Сеня?',9),('9 мальчиков играли в жмурки. Один мальчик вышел из игры. Сколько мальчиков продолжало игру?',8)] if p==27 else [('Костя научился писать 7 цифр, а потом ещё 1 цифру. Сколько всего цифр он научился писать?',8),('У Юры было 8 голубей. 1 голубь улетел. Сколько голубей осталось у Юры?',7)])
  split(p,n);work(p,'Части на домино',[(f'{a} + □ = {n}',n-a) for a in range(n-1,(n-1)//2,-1)],[f'domino_{n}_{a}_{n-a}' for a in range(n-1,(n-1)//2,-1)]);split(p,n,objects=True);coins(p,n);count(p,n)
  sums(p,['5+1','6+1','7+1','8−1','7−1','6−1','5−1','4−1','4+1'] if p==25 else ['4+1','6+1','8+1','9−1','8−1','7−1','5−1','5+1','4−1'])
 work(26,'Число девять',[('Пионеров',9),('Роз',9),('Связок флажков',3),('Флажков в связке',3),('Всего флажков',9)],['pioneers_marching','roses_vase','flags_9']);digit(26,9,'digit_9_sample');shape(26,'Три треугольника',['triangle']*3,'sticks_triangles');more(26,9);fruit(26,9,'tree');work(26,'Каких чисел не хватает?',[('1, 2, □, 4, 5, 6, □, 8, □: первый пропуск',3),('Второй пропуск',7),('Третий пропуск',9)])
 work(28,'Число десять',[('Детей делают зарядку',9),('Всего людей с инструктором',10)],['kids_gymnastics']);shape(28,'Звезда из десяти палочек',['star'],'sticks_star');digit(28,10,'digit_10_sample');work(28,'Грибы и карандаши',[('Лена нарисовала 9 маленьких грибов и 1 большой гриб. Сколько всего грибов нарисовала Лена?',10),('В коробке было 10 цветных карандашей. Мальчик взял 1 карандаш. Сколько карандашей осталось в коробке?',9)]);fruit(28,10,'mushroom');work(28,'Каких чисел не хватает?',[(label,v) for label,v in zip(['1, 2, □, 4, □, 6, □, 8, □, 10: первый пропуск','Второй пропуск','Третий пропуск','Четвёртый пропуск'],[3,5,7,9])])
 work(29,'Игрушечный поезд',[('9 вагонов и ещё один. Сколько всего?',10)],['boy_toy_train']);split(29,10,['squares_green_red']);work(29,'Состав десяти',[(f'{a} + □ = 10',10-a) for a in [9,8,7,6,5]],['bars_10_all']);split(29,10,objects=True);coins(29,10);count(29,10)
 # Attach source illustrations to the corresponding activity, never a catch-all opening lesson.
 for p,blocks in pages.items():
  used={x for b in blocks for x in b['images']}
  missing=[a['id'] for a in assets if a['page']==p and a['id'] not in used]
  for image in missing:
   suffix=image[5:]
   if p==11: dest=next(b for b in blocks if b['title']=='Два набора мячей')
   elif re.search(r'^digit_|^abacus_|^domino_|^dots_|green_dots|green_circles|^circles_[56]$|^coin_',suffix):
    dest=next((b for b in blocks if b.get('plan','').startswith('digit:')),blocks[0])
   elif 'number_' in suffix:dest=next((b for b in blocks if 'не хватает' in b['title']),next((b for b in blocks if b.get('activity',{}).get('mode')=='sequence'),blocks[0]))
   elif 'bar_' in suffix:dest=next((b for b in blocks if b.get('activity',{}).get('mode')=='composition'),blocks[0])
   else:
    # Completed sums are explanations. Keep them visible with their exercise.
    matches=[b for b in blocks if b['kind']=='work']
    dest=next((b for b in matches if any(suffix.replace('_eq_2','').replace('_eq_3','').replace('_eq_4','').replace('_eq_5','') in im for im in b['images'])),matches[-1] if matches else blocks[0])
   dest['images'].append(image)
 return pages
