# EduKids – Contenu dynamique

Ce dépôt contient les exercices téléchargeables par l'application **EduKids**.  
Il est servi via **GitHub Pages** à l'adresse :

```
https://johndev38.github.io/educ/
```

---

## Structure

```
/
├── catalog.json          ← liste de tous les exercices distants
└── exercises/
    ├── tables_multiplication.zip
    ├── dictee_ce2.zip
    └── ...
```

---

## Ajouter un nouvel exercice (sans recompiler l'app)

### 1. Créer les 4 fichiers de l'exercice

```
mon_exercice/
├── index.html
├── style.css
├── script.js
└── manifest.json
```

### 2. Créer le .zip (fichiers à la racine, pas de sous-dossier)

Sous PowerShell :
```powershell
cd assets/exercises/mon_exercice
Compress-Archive -Path index.html,style.css,script.js,manifest.json `
                 -DestinationPath mon_exercice.zip
```

### 3. Copier le .zip dans `exercises/`

```
cp mon_exercice.zip server/exercises/
```

### 4. Ajouter l'entrée dans `catalog.json`

```json
[
  {
    "id":          "mon_exercice",
    "title":       "Titre affiché dans l'app",
    "description": "Description courte.",
    "version":     "1.0.0",
    "zipUrl":      "https://johndev38.github.io/educ/exercises/mon_exercice.zip",
    "sizeBytes":   15000,
    "category":    "Mathématiques",
    "difficulty":  "easy",
    "ageMin":      6,
    "ageMax":      9,
    "iconName":    "calculate",
    "colorHex":    "4A90D9"
  }
]
```

**Valeurs possibles :**
- `difficulty` : `"easy"` · `"medium"` · `"hard"`
- `iconName` : `"calculate"` · `"menu_book"` · `"format_list_numbered"` · `"science"` · `"music_note"` · `"star"`
- `colorHex` : couleur hex sans `#` (ex : `"E74C3C"`)

### 5. Pusher sur GitHub

```bash
git add catalog.json exercises/mon_exercice.zip
git commit -m "Add exercise: mon_exercice"
git push
```

L'app détecte automatiquement le nouvel exercice au prochain lancement.

---

## Mettre à jour un exercice existant

1. Modifier les fichiers de l'exercice
2. Recréer le `.zip`
3. Remplacer le fichier dans `exercises/`
4. **Incrémenter la `version`** dans `catalog.json` (ex : `"1.0.0"` → `"1.1.0"`)
5. Pusher

L'app re-télécharge automatiquement l'exercice mis à jour.

---

## Icônes disponibles

| `iconName`              | Icône              |
|-------------------------|--------------------|
| `calculate`             | 🔢 Calculatrice    |
| `menu_book`             | 📖 Livre           |
| `format_list_numbered`  | 🔢 Liste numérotée |
| `science`               | 🔬 Science         |
| `music_note`            | 🎵 Musique         |
| `star`                  | ⭐ Étoile          |
| `color_lens`            | 🎨 Art             |
