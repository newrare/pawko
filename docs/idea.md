***bonus session***
100 currency -> +1 bille transparente dans un launcher (ball level 1 required)
500 currency -> +1 bille noire dans un launcher (no ability required)
500 currency -> supprime une bille de glace (ice ball) de la partie (luky level 1)
600 currency -> supprime une bille de feu (fire ball) de la partie (luky level 2)
1000 currency -> +1 bille noire supplémentaire dans chaque lancher (no ability required)

1000 currency -> diminue de x% le gate de malus de score (gate level 1 required)
1500 currency -> augment de x% le gate X<value> (gate level 2 required)
10000 currency -> le gate x<value> devient un gate x<valueX2> (gate level 3 required)

2000 currency -> ajoute un quatrième launcher avec 2 billes classique (launcher level 1 required)
4000 currency -> ajoute un cinquième launcher avec 2 billes classique (launcher level 2 required)
8000 currency -> ajoute un sixième launcher  avec 2 billes classique (launcher level 3 required)
9000 currency -> ajoute un septième launcher avec 2 billes classiques (launcher level 4 required)
10000 currency -> ajoute un huitième launcher avec 2 billes classiques (launcher level 5 required)
10000 currency -> ajoute un neuvième launcher avec 2 billes classiques (launcher level 6 required)

2000 currency -> score multiplié par x sur les peg classiques pendant 3 pinboards (pinboard level 2 required)

2000 curency -> une bille classique qui touche un bumper libère 1 nouvelle bille de verre

***malus session***
- réduit le score de x% pour le prochain pinboard

- ajoute une bille de glace (ice ball) dans chaque launcher
- ajoute une bille de feu (fire ball) dans chaque launcher
- transforme une bille classique en bille de verre (glass ball) dans chaque launcher
- offusque le numéro de level du pinboard sur la grille

***bonus permanent***
700 currency -> première bille supplémentaire dans chaque launcher (ball level 1 required)
4000 currency -> deuxième bille supplémentaire dans chaque launcher (ball level 2 required)
9000 currency -> troisième bille supplémentaire dans chaque launcher (ball level 3 required)

5000 currency -> les shops sont 10% moins chers (pinboard level 3 required)

5000 currency -> les abilities deviennent visibles sur la grille (avantage level 1 required)
7000 currency -> les cases mystères deviennet visibles sur la grille (avantage level 2 required)
10000 currency -> les shop deviennent visibles sur la grille (avantage level 2 required)
20000 currency -> les liens ou chemin entre les cases deviennent visibles sur la grille (avantage level 3 required)
25000 currency -> le boss devient visible sur la grille (avantage level 4 required)

***pinboard effect***
- magnet: attire les billes (voir le cercle de gravité)
- ice: un peg sous ice effet ne donne rien
- fire:

***hud***
- avoir un compteur de billes (classique, noire, verre, glace, feu),, un compteur de billes cumulé (tous type) un compteur de launcher, un compteur de clef, un compteur de currency, un compteur de diamond, le score total cumulé de la partie en cours, le level max de pinboard atteint
- avoir une modal avant de lancer un level pinboard qui prédit le score total moyen possible avec le nombre de billes actuel

***grid***
- case mystère: donne des bonus ou malus de sessions aléatoires

***peg***
- classic: score 2pt
- bumper: score 10pt
- currency: donne de la currency
- diamond: donne des diamond (pour le déblocage d'abilité)
- glue: colle les billes
- cat: mange une bille (possède 10pv)
- boss: mange plusieurs billes (possède 100pv)
- teleport: téléporte les billes vers une autre partie de la grille
- chest: donne un bonus aléatoire à la destruction (currency, diamond, ability, launcher, etc.)
- key: donne une clef au joueur puis est détruit (couleur de rarety donc 4 ou 5 types de clefs possible)
- chester: (4 ou 5 types possibles) donne un gros bonus aléatoire à la destruction: currency, diamond, ability, launcher, (possède 100pv -> si à 0 coffre détruit sans bonus)
- shield: créer une zone circulaire autour du peg ou les billes ne peuvent pas entrer, le shield à un nombre limite de hit et un délai de réactivation
- mystery: donne un malus ou bonus aléatoire (possède 10pv)

***ball***
- ice: gel n'importe quel peg sauf cat et boss pendant 3 hits
- fire: brûle n'importe quel peg (le peg reste actif mais réduit les scores de base par 2)
- glass: la bille se détruit après 20 hits
- black: la bille ne rapporte pas de points mais peut lébérer des billes bloquées sur les peg glue, inflige aussi des dégâts sur car et boss
- electrical: la bille electrifie les peg qu'elle touche, si deux peg électrique sont cote à cote, cela créer un arc et créer un combo x fois du total score du level