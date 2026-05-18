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
- avoir un compteur de billes (classique, noire, verre, glace, feu), un compteur de billes cumulé (tous type) un compteur de launcher, un compteur de clef par rareté, un compteur de currency, un compteur de diamond, le score total cumulé de la partie en cours, le level max de pinboard atteint (toute partie)
- avoir une modal avant de lancer un level pinboard qui prédit le score total moyen possible avec le nombre de billes actuel

***grid***
- case mystère: donne des bonus ou malus de sessions aléatoires

***peg***
- <peg-name> (<pointDeVie>|<frequenceParLayer>): <description>

- classic (1000pv|hight): score 2pt de base par hit de ball
- bumper (1000pv|low): score 10pt de base par hit de ball
- currency (1000pv|medium): donne 1 currency de base par hit de ballde la currency
- diamond (5pv|medium): donne un diamond à chaque hit de ball (les diamonds servirons au déblocage d'abilité)
- glue (5pv|low): colle une bille (la bille ne pourra jamais arriver sur une gate, il faut considérer qu'elle n'est plus en jeu), si elle est détruite, la bille collée revient en jeu et est libérée
- cat (20pv|low): mange une bille, si cat est détruit il libère la bille mangée, la bille mangé ne pourra pas arriver sur une gate, sauf si elle est libérée
- boss (50pv|low): mange plusieurs billes, même comportement que pour cat
- teleport(2pv|medium): téléporte aléatoirement les billes vers une autre partie de la grille
- chest (2pv|medium): donne un bonus aléatoire à la destruction (currency fois x, diamond fois x, launcher bonus temporaire ou permanent, + x ball dans chaque launcher)
- key (1pv|medium): donne une clef de rareté lorsqu'il est détruit (couleur des clef rarety: 'legendary' | 'epic' | 'rare' | 'common'), la clef va dans un inventaire générale à la partie
- chester (20pv|low): un chester de couleur par rareté 'legendary' | 'epic' | 'rare' | 'common'. au premier hit d'une ball, donne un gros bonus aléatoire si le joueur possède/utilise la bonne clef de couleur de son inventaire. Si le coffre est détruit par pv, donne un bonus comme un chest classique
- shield (1pv|low): créer une zone circulaire autour du peg, les billes ne peuvent pas entrer, le shield à un nombre limite de 5 hits puis est désactiver pendant 5 secondes puis se réactive
- mystery (2pv|medium): donne un malus ou un bonus aléatoire

-> visuellement, un peg qui sera détruit au prochain hit tremble légèrement

***ball***
- ice: gel n'importe quel peg sauf cat et boss pendant 3 hits, si le peg est déjà sous l'influence de ice, on remet le peg à 3 hits, si une fire ball touche un peg iced, la glace disparait immédiatement et le peg revient à son état habituelle.
- fire: brûle n'importe quel peg (le peg reste actif mais réduit les scores de base par 2)
- glass: la bille se détruit après 20 hits
- black: la bille ne rapporte pas de points mais peut lébérer des billes bloquées sur les peg glue, inflige aussi des dégâts à l'ensemble des peg
- electrical: la bille electrifie les peg qu'elle touche, si deux peg électrique sont cote à cote (même layer), cela créer un gros arc électrique entre les peg. Si une ball passe dans ce gros arc, on écrit en gros sur l'écran  "Combo fois x" (incrémenter), ce multiplicateur s'appliquera à la fin de la run pinboard sur le score total du niveau en cours.

-> visuellement, un peg sous l'influence de ice aura un ring en pointillé bleu autour du peg (beaucoup de pointillé = encore 3 hits, pointillé modéré = 2 hits, très peu de pointillé = 1 hits)
-> visuellement, un peg sous l'effet fire brulle (rouge)
-> visuellement, un glass ball est transparent mais 3 hits avant sa destruction, se fissures apparaissent sur la bille (3 hits restant + peu de fisure, 1 hit restant + beaucoup de vissures)
-> vusuellement, un peg sous l'effet electical possède des arcs electrique autour du peg

Dans le panel d'admin, il faut un bouton pour obtenir une nouvelle bille dans le pinboard en cours (pour chaque type)
Sur la vue style guide, il faut visuellement voir les différentes ball ainsi que les peg sous les effets des ball

Lorsqu'on débute une partie (nouvelle grille), il faut avoir 3 launchers avec 2 billes classiques dans chaque launcher.