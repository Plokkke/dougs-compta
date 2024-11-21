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
import { DougsApiByLogin } from 'dougs-compta';
import { DateTime } from 'luxon';

(async () => {
  const api = new DougsApiByLogin({
    username: 'john.doe@domain.com',
    password: 'password',
  });
  
  const user = await api.getMe();

  await api.registerMileageAllowance(user.company.id, {
    date: DateTime.now(),
    memo: 'Home -> Office',
    distance: 38,
  });
  
  await api.validateOperation(user.company.id, 77539);
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

#### `Car`
Représente un véhicule associé à l'utilisateur.

```typescript
export type Car = {
  id: number;
  name: string;
  content: {
    licensePlate: string;
  },
  partner: {
    naturalPerson: {
      id: number;
      firstName: string;
      lastName: string;
      fullName: string;
      initials: string;
    }
  }
};
```

- `id` : Identifiant unique du véhicule.
- `name` : Libellé du véhicule.
- `content` : Informations sur le véhicule, incluant :
    - `licensePlate` : Numéro de plaque d'immatriculation.
- `partner` : Partenaire associé au véhicule, incluant :
    - `naturalPerson` : Informations sur la personne associée, incluant :
        - `id` : Identifiant unique de la personne.
        - `firstName` : Prénom de la personne.
        - `lastName` : Nom de la personne.
        - `fullName` : Nom complet de la personne.
        - `initials` : Initiales de la personne.

#### `Category`
Représente une catégorie de dépense.

```typescript
export type Category = {
  id: number;
  wording: string;
  keywords: string[];
  description: string;
};
``` 

- `id` : Identifiant unique de la catégorie.
- `wording` : Libellé de la catégorie.
- `keywords` : Mots-clés associés à la catégorie.
- `description` : Description de la catégorie.

#### `MileageInfos`
Décrit les informations nécessaires pour enregistrer une indemnité kilométrique.

```typescript
export type MileageInfos = {
  date: DateTime<true>;
  memo: string;
  distance: number;
  carId?: number;
};
```

- `date` : Date du trajet (objet `DateTime` compatible avec `luxon`).
- `memo` : Motif du déplacement.
- `distance` : Distance parcourue en kilomètres.
- `carId` *(optionnel)* : Identifiant du véhicule utilisé.

#### `ExpenseInfos`
Décrit les informations nécessaires pour enregistrer une dépense.

```typescript
export type ExpenseInfos = {
  date: DateTime<true>;
  memo: string;
  amount: number;
  categoryId: number;
  partnerId: number;
  hasVat?: boolean;
};
```

- `date` : Date du trajet (objet `DateTime` compatible avec `luxon`).
- `memo` : Motif du déplacement.
- `amount` : Montant de la dépense (en centimes).
- `categoryId` : Identifiant de la catégorie de dépense.
- `partnerId` : Identifiant du partenaire associé à la dépense.
- `hasVat` *(optionnel)* : Indique si la dépense inclut la TVA. Par défaut, `true`.

### Fonctions principales

#### `get haveValidSession(): boolean`
Indique si l'utilisateur dispose d'une session valide.

- Return `boolean`: `true` si l'utilisateur dispose d'une session valide, `false` sinon.

#### `async getSessionToken(): Promise<string>`
Récupère le jeton de session de l'utilisateur.

- Return `string`: Jeton de session de l'utilisateur.

#### `async getMe(): Promise<User>`
Récupère les informations de l'utilisateur connecté.

- Return [User](#User)

#### `async getCars(companyId: number): Promise<Car[]>`
Récupère la liste des véhicules associés à l'utilisateur.

- Argument `companyId`: ID de l'entreprise associée à l'utilisateur.
- Return [Car[]](#Car)

#### `async getCategories(companyId: number, type: string, search?: string): Promise<Category[]>`
Récupère la liste des catégories de dépense associées à l'utilisateur.

- Argument `companyId`: ID de l'entreprise associée à l'utilisateur.
- Argument `type`: Type de catégorie à récupérer. (ex: `expense`)
- Argument `search` *(optionnel)*: Mot-clé de recherche.
- Return [Category[]](#Category)

#### `async registerMileageAllowance(companyId: number, infos: MileageInfos): Promise<void>`
Permet d'enregistrer une indemnité kilométrique pour l'utilisateur.

- Argument `companyId`: ID de l'entreprise associée à l'utilisateur.
- Argument `infos`: [MileageInfos](#MileageInfos)

#### `async registerExpense(companyId: number, expense: ExpenseInfos): Promise<void>`
Permet d'enregistrer une dépense pour l'utilisateur.

- Argument `companyId`: ID de l'entreprise associée à l'utilisateur.
- Argument `expense`: [ExpenseInfos](#ExpenseInfos)

#### `async updateOperation(companyId: number, operationId: number, infos: Record<string, unknown>): Promise<void>`
Permet de mettre à jour une opération.

- Argument `companyId`: ID de l'entreprise associée à l'utilisateur.
- Argument `operationId`: ID de l'opération à mettre à jour.
- Argument `infos`: Informations à mettre à jour.

#### `async validateOperation(companyId: number, operationId: number): Promise<void>`
Permet de valider une opération.

- Argument `companyId`: ID de l'entreprise associée à l'utilisateur.
- Argument `operationId`: ID de l'opération à valider.

#### `async deleteOperation(companyId: number, operationId: number): Promise<void>`
Permet de supprimer une opération.

- Argument `companyId`: ID de l'entreprise associée à l'utilisateur.
- Argument `operationId`: ID de l'opération à supprimer.

## Roadmap

- [ ] Return operation details for follow up
- [ ] Add tests

## Contribution

Les contributions sont les bienvenues ! Si vous souhaitez ajouter de nouvelles fonctionnalités, corriger des bugs ou améliorer la documentation, n'hésitez pas à soumettre une pull request.

## Licence

Pas de licence pour le moment.

---

**Remarque** : Cette bibliothèque est non officielle et n'est pas affiliée à Dougs. Utilisez-la à vos propres risques.