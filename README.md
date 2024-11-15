# dougs-compta

`dougs-compta` est une bibliothèque non officielle en TypeScript permettant d'interagir avec l'API de l'application [Dougs](https://www.dougs.fr/), une application de comptabilité pour les entreprises et les entrepreneurs. Cette bibliothèque simplifie l'accès aux fonctionnalités courantes offertes par l'API de Dougs.

## Installation

Ajoutez la bibliothèque à votre projet avec npm ou yarn :

```bash
npm install @plokkke/dougs-compta
```

## Utilisation

### Initialisation de l'API

Pour utiliser la bibliothèque, commencez par créer une instance de `DougsApi` avec vos identifiants de connexion.

```typescript
import { DougsApi } from 'dougs-compta';
import { DateTime } from 'luxon';

(async () => {
  const api = new DougsApi({
    username: 'john.doe@domain.com',
    password: 'password',
  });
  
  const user = await api.getMe();

  // Enregistrement d'une indemnité kilométrique
  await api.registerMileageAllowance(user.company.id, {
    date: DateTime.now(),
    distance: 38,
    reason: 'Home -> Office',
  });
})();
```
### Types

#### `DougsCredentials`
Représente les identifiants de connexion de l'utilisateur.

```typescript
export type DougsCredentials = {
  username: string;
  password: string;
};
```

- `username` : Adresse e-mail de l'utilisateur.
- `password` : Mot de passe de l'utilisateur.

#### `MileageInfos`
Décrit les informations nécessaires pour enregistrer une indemnité kilométrique.

```typescript
export type MileageInfos = {
  date: DateTime<true>;
  distance: number;
  reason: string;
  carId?: number;
};
```

- `date` : Date du trajet (objet `DateTime` compatible avec `luxon`).
- `distance` : Distance parcourue en kilomètres.
- `reason` : Motif du déplacement.
- `carId` *(optionnel)* : Identifiant du véhicule utilisé.

#### `Company`
Représente une entreprise associée à l'utilisateur.

```typescript
export type Company = {
  id: number;
  brandName: string;
};
```

- `id` : Identifiant unique de l'entreprise.
- `brandName` : Nom commercial de l'entreprise.

#### `User`
Représente un utilisateur connecté et ses entreprises associées.

```typescript
export type User = {
  id: number;
  email: string;
  company: Company;
  companies: Company[];
};
```

- `id` : Identifiant unique de l'utilisateur.
- `email` : Adresse e-mail de l'utilisateur.
- `company` : Entreprise principale de l'utilisateur.
- `companies` : Liste des entreprises associées à l'utilisateur.

### Fonctions principales

#### `async getMe(): Promise<User>`
Récupère les informations de l'utilisateur connecté.

```typescript
const user = await api.getMe();
console.log(user);
```

#### `async registerMileageAllowance(companyId: number, mileage: MileageInfos): Promise<void>`
Permet d'enregistrer une indemnité kilométrique pour l'utilisateur.

- `companyId`: ID de l'entreprise associée à l'utilisateur.
- `data`: Données de l'indemnité kilométrique, incluant :
    - `date`: Date de l'indemnité (`DateTime` de `luxon`).
    - `distance`: Distance parcourue en kilomètres.
    - `reason`: Motif du déplacement.

Exemple :

```typescript
await api.registerMileageAllowance(user.company.id, {
  date: DateTime.now(),
  distance: 38,
  reason: 'Home -> Office',
});
```

## API supportée

Cette bibliothèque prend en charge les fonctionnalités suivantes de l'API Dougs (liste non exhaustive) :
- Authentification utilisateur
- Récupération des informations utilisateur (`getMe`)
- Enregistrement des indemnités kilométriques (`registerMileageAllowance`)

## Contribution

Les contributions sont les bienvenues ! Si vous souhaitez ajouter de nouvelles fonctionnalités, corriger des bugs ou améliorer la documentation, n'hésitez pas à soumettre une pull request.

## Licence

Pas de licence pour le moment.

---

**Remarque** : Cette bibliothèque est non officielle et n'est pas affiliée à Dougs. Utilisez-la à vos propres risques.