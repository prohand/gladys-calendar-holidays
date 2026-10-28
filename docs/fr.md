# Holidays Calendar (jours fériés et vacances scolaires)

Les jours fériés et les vacances scolaires apparaissent directement dans le **calendrier de Gladys**, à
côté de vos autres calendriers. Vos scènes peuvent ensuite s'en servir avec les blocs calendrier de
Gladys : le réveil, le chauffage et les volets ne se comportent plus pareil un jour férié ou pendant les
vacances.

- **Jours fériés d'environ 200 pays** et de leurs régions (Alsace-Moselle, Länder allemands, cantons
  suisses, provinces canadiennes, États américains…), calculés **hors ligne** sur votre Gladys : sans
  compte, sans réseau.
- **Vacances scolaires françaises** de votre zone (facultatif), tirées des données ouvertes de
  l'Éducation nationale, dans un second calendrier.
- Vos **ponts et jours de fermeture** ajoutés au calendrier des fériés, et les fériés que vous ne voulez
  pas voir retirés.

> Testée par sa suite de tests automatiques, pas encore sur beaucoup de Gladys réelles : vos retours sont
> les bienvenus sur le forum Gladys ou dans les issues GitHub.

## Ce qu'il vous faut

- Gladys Assistant **5.2.0** ou plus récent (les intégrations de type calendrier arrivent avec cette
  version).
- Rien d'autre : ni compte, ni clé d'API, ni matériel. Seules les vacances scolaires françaises demandent
  un accès à Internet, une fois par jour.

## Configuration

Installez l'intégration (**Intégrations → Installer depuis GitHub**, adresse
`https://github.com/prohand/gladys-calendar-holidays`), ouvrez son onglet **Configuration**, remplissez les
champs ci-dessous et enregistrez. Ces réglages valent pour toute la maison.

### Pays et subdivision

- **Pays** : les fériés à suivre. Les pays francophones viennent en premier, puis les autres par ordre
  alphabétique (en anglais).
- **Subdivision** : facultatif, pour une région qui a ses propres fériés. Exemples : `67`, `68` ou `57`
  pour l'Alsace-Moselle (Vendredi saint et 26 décembre), `BY` pour la Bavière, `QC` pour le Québec, `VD`
  pour le canton de Vaud. Certaines subdivisions ont des régions : `BY-KATH` pour les communes
  catholiques de Bavière (15 août). Le bouton **Vérifier la configuration** liste les codes du pays.
- **Jours mis dans le calendrier** : les fériés publics seulement par défaut. Vous pouvez ajouter les
  fériés bancaires, les jours sans école locaux, les jours facultatifs et les célébrations (fête des
  Mères, dimanche de Pentecôte…).

### Jours chômés en plus et fériés retirés

- **Jours chômés en plus** : ponts ou jours de fermeture, ajoutés au calendrier des fériés, séparés par
  des virgules : `2026-05-15` pour une date, `12-24` pour chaque année, avec un nom facultatif après `=` :
  `2026-05-15=Pont de l'Ascension, 12-24=Réveillon`. Sans nom, l'évènement s'appelle « Jour de congé ».
- **Fériés retirés** : fériés à ne pas mettre dans le calendrier, séparés par des virgules. Un nom dans
  n'importe quelle langue (`Lundi de Pentecôte` pour la journée de solidarité, quelle que soit sa date),
  une date (`2027-05-17`) ou un jour de chaque année (`12-26`).

### Vacances scolaires françaises

Pour la France et l'outre-mer. Choisissez votre **zone** : A, B, C, Corse, Guadeloupe, Guyane, Martinique,
Mayotte, La Réunion ou Saint-Pierre-et-Miquelon. Les vacances des élèves sont lues une fois par jour sur
data.education.gouv.fr, puis gardées : une coupure d'Internet ne change rien aux jours déjà connus.
Laissez **Aucune** pour que l'intégration reste entièrement hors ligne.

## Activer les calendriers (« Mes calendriers »)

Dans Gladys, un calendrier appartient à un utilisateur. Chaque personne qui veut les calendriers ouvre la
page de l'intégration et clique sur **Activer pour moi** dans le bloc **Mes calendriers**. Elle reçoit
alors :

- **Jours fériés (France)** (en rouge) : un évènement « journée entière » par férié, de janvier de cette
  année à décembre de l'année prochaine ;
- **Vacances scolaires (Zone C)** (en vert), si une zone est choisie : un évènement par période, du
  premier jour de vacances à la veille de la rentrée.

Les noms des calendriers et des fériés suivent la langue de chaque utilisateur (anglais, français,
allemand ou espagnol). Sous chaque calendrier, deux interrupteurs :

- **Synchroniser ce calendrier** : coupé, le calendrier est vidé et l'intégration ne l'alimente plus ;
- **Partager avec le foyer** : voir ci-dessous.

**Désactiver et supprimer mes calendriers** retire les calendriers de cette personne ; une nouvelle
activation les recrée.

## Utiliser les calendriers dans les scènes

Gladys ne montre aux scènes que les calendriers **partagés** : activez **Partager avec le foyer** sur le
calendrier voulu (une seule personne de la maison suffit). Ensuite, dans l'éditeur de scènes :

- déclencheur **Un évènement dans le calendrier arrive** : par exemple au début de n'importe quel
  évènement du calendrier « Jours fériés », ou la veille à 20 h ;
- action **Condition sur un évènement d'un calendrier** : « continuer seulement si un évènement est en
  cours dans Vacances scolaires », pour ne pas sonner le réveil des enfants pendant les vacances ;
- action **Récupérer les évènements d'un calendrier** : pour annoncer le prochain férié dans un message.

Exemple : une scène « Réveil » à 7 h en semaine, avec la condition « aucun évènement en cours dans Jours
fériés », ne sonne pas le 14 juillet.

## Ce qui est envoyé, et quand

- Au démarrage, au retour de Gladys après un redémarrage et à chaque enregistrement de la configuration,
  tout est renvoyé.
- Quand quelqu'un active l'intégration ou rallume un calendrier, ses calendriers sont renvoyés.
- Toutes les 15 minutes, l'intégration regarde ce qui a changé (calendrier scolaire relu, nouvelle année)
  et n'envoie que cela. Le 1er janvier, l'année suivante s'ajoute ; les années passées restent dans le
  calendrier comme historique.
- Un évènement que vous créez à la main dans ces calendriers n'est jamais supprimé par l'intégration.

## Dépannage

- **Je ne vois pas les calendriers** : activez l'intégration pour vous dans **Mes calendriers**, puis
  rechargez la vue Calendrier.
- **La scène ne réagit pas** : le calendrier doit être **partagé avec le foyer**.
- **Un férié de ma région manque** : renseignez la **Subdivision**. **Vérifier la configuration** liste
  les codes et signale un code inconnu.
- **Pas de vacances scolaires** : vérifiez la zone et l'accès à Internet de Gladys.
  **Vérifier la configuration** dit jusqu'à quelle date les vacances sont connues et ce qu'il faut
  corriger.
- Le statut de l'intégration passe en erreur quand Gladys refuse un envoi ; l'intégration réessaie toute
  seule au quart d'heure suivant.

## Limites

- Un pays par installation, le même pour toute la maison.
- Les fériés décidés tard par un gouvernement arrivent avec une mise à jour de date-holidays ; le champ
  **Jours chômés en plus** couvre l'attente. Les fêtes lunaires peuvent différer d'un jour de l'annonce
  officielle.
- Vacances scolaires : élèves seulement ; Nouvelle-Calédonie, Polynésie française et Wallis-et-Futuna ne
  sont pas proposées. Au-delà de ce que le ministère a publié, rien n'est inventé.
- Chaque utilisateur a sa propre copie des calendriers : si deux personnes les partagent, les scènes
  voient chaque férié deux fois.

## Crédits

- [date-holidays](https://github.com/commenthol/date-holidays) (code ISC, données CC BY 3.0) : les fériés
  de tous les pays.
- [Calendrier scolaire](https://data.education.gouv.fr/explore/dataset/fr-en-calendrier-scolaire/) du
  ministère de l'Éducation nationale (Licence Ouverte 2.0).
- [gladys-holidays](https://github.com/guim31/gladys-holidays) (Apache-2.0) : le calcul des fériés et la
  lecture du calendrier scolaire viennent de cette intégration.
