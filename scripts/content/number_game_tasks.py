"""Restore the game in exercise 199 (p058) and digit reading in 208 (p061).

The second hidden-card round is the requested similar game, not printed source
content. The original 4 + ? = 6 round and all five printed numbers stay intact.
"""

NUMBER_GAMES = {
    199: dict(kind='numberGame', numberGame=dict(mode='guess', rounds=[
        dict(id='source', label='Загадка из учебника', visible=4, total=6),
        dict(id='play', label='Теперь сыграй: новая загадка', visible=3, total=8),
    ])),
    208: dict(kind='numberGame', numberGame=dict(mode='readNumbers', items=[
        dict(id='n13', value=13, expected='тринадцать',
             options=['пятнадцать', 'тринадцать', 'девятнадцать']),
        dict(id='n15', value=15, expected='пятнадцать',
             options=['пятнадцать', 'двадцать', 'шестнадцать']),
        dict(id='n16', value=16, expected='шестнадцать',
             options=['девятнадцать', 'тринадцать', 'шестнадцать']),
        dict(id='n19', value=19, expected='девятнадцать',
             options=['шестнадцать', 'девятнадцать', 'пятнадцать']),
        dict(id='n20', value=20, expected='двадцать',
             options=['двадцать', 'пятнадцать', 'тринадцать']),
    ])),
}
