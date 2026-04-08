# NAVISOL v4 - Backup & Beveiliging Checklist

**Datum**: 10 maart 2026
**Status**: Gedeeltelijk geborgd - actie vereist

---

## ✅ WAT IS NU AL VEILIG

### 1. Code Backup (GitHub)

✅ **Volledige broncode** gepusht naar GitHub
- Repository: https://github.com/erikvandenbrand-cloud/navisol-boat-configurator
- Branch: master
- Commit: 50006c8
- 325 bestanden, 139.082+ regels code
- Alle componenten, services, tests, documentatie

**Status**: ✅ VEILIG GEBORGD

**Hoe te herstellen**:
```bash
git clone https://github.com/erikvandenbrand-cloud/navisol-boat-configurator.git
cd navisol-boat-configurator
bun install
bun run build
bun run start
```

---

### 2. Database (Supabase)

✅ **Supabase project actief**
- Database schema aanwezig
- Entities tabel met data
- RLS policies actief

**Status**: ⚠️ GEDEELTELIJK VEILIG
- Data staat in Supabase cloud
- MAAR: Geen automatische backups geconfigureerd

---

## ⚠️ WAT MOET NOG GEBORGD WORDEN

### 1. Supabase Database Backups

**BELANGRIJKSTE PRIORITEIT**

#### Wat te doen:

**Optie A: Automatische Backups Activeren (Aanbevolen)**

1. Ga naar Supabase Dashboard
2. Klik op je project
3. Ga naar **Settings** → **Database**
4. Scroll naar **Backup Settings**
5. Schakel **Point-in-Time Recovery (PITR)** in
   - Dit kost extra (Pro plan vereist ~$25/maand)
   - Maakt elke dag automatisch backups
   - Je kunt herstellen naar elk moment in de tijd

**Optie B: Handmatige Backups (Gratis)**

Maak wekelijks/maandelijks een handmatige backup:

1. **Via SQL Dump**:
```sql
-- In Supabase SQL Editor, kopieer alle data:
COPY (
  SELECT * FROM entities
) TO STDOUT WITH CSV HEADER;
```

2. **Via pgAdmin** (als je toegang hebt):
   - Verbind met Supabase database
   - Rechtermuisklik op database → Backup
   - Sla .dump bestand op veilige locatie

3. **Via Export Script** (maak dit bestand):

```typescript
// scripts/backup-database.ts
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function backupDatabase() {
  const { data, error } = await supabase
    .from('entities')
    .select('*');

  if (error) throw error;

  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `backup-${timestamp}.json`;

  fs.writeFileSync(filename, JSON.stringify(data, null, 2));
  console.log(`✅ Backup gemaakt: ${filename}`);
}

backupDatabase();
```

**Run backup**:
```bash
bun run scripts/backup-database.ts
```

**Bewaar backups op**:
- ✅ Lokale schijf (encrypted)
- ✅ Google Drive / Dropbox
- ✅ Externe harde schijf (offline backup)

---

### 2. Environment Variabelen Backup

⚠️ **KRITIEK - Deze zijn NIET in GitHub**

Je `.env.local` bestand bevat:
- Supabase URL
- Supabase Anon Key

**Wat te doen**:

1. **Maak een veilige kopie**:
```bash
cd navisol-boat-configurator
cp .env.local .env.backup
```

2. **Bewaar op veilige locatie**:
   - Wachtwoord manager (1Password, Bitwarden)
   - Encrypted bestand op cloud (Google Drive encrypted folder)
   - NOOIT in GitHub committen!

3. **Documenteer de waarden**:
```markdown
# Supabase Configuratie

Project: [Jouw Supabase Project Naam]
URL: [Jouw URL]
Anon Key: [Jouw Key]
Service Key: [Als je die hebt]

Datum: 10 maart 2026
Locatie: .env.local in project root
```

---

### 3. Supabase Project Settings Backup

⚠️ **BELANGRIJK**

**Wat te doen**:

1. **Noteer project details**:
   - Project ID
   - Project naam
   - Region (bijv. eu-west-1)
   - Database wachtwoord (als je dat nog weet)

2. **Export database migraties**:
   - Alle SQL bestanden in `supabase/migrations/` zijn al in Git ✅

3. **Bewaar RLS policies**:
```sql
-- Run dit in Supabase SQL Editor en bewaar output:
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'entities';
```

---

### 4. GitHub Repository Beveiliging

**Wat te doen**:

1. **Branch Protection inschakelen**:
   - Ga naar GitHub → Settings → Branches
   - Klik "Add branch protection rule"
   - Branch name pattern: `master`
   - Vink aan:
     - ✅ Require pull request reviews
     - ✅ Require status checks to pass
     - ✅ Include administrators

2. **Tweede GitHub account toevoegen** (als backup):
   - Settings → Collaborators
   - Voeg een tweede account toe (privé of collega)

3. **Repository private maken** (als nog niet):
   - Settings → General → Change visibility → Private

---

### 5. Lokale Development Backup

**Wat te doen**:

1. **Maak regelmatig commits**:
```bash
git add .
git commit -m "beschrijving van wijzigingen"
git push origin master
```

2. **Clone repository op tweede locatie**:
```bash
# Op tweede computer of externe schijf
git clone https://github.com/erikvandenbrand-cloud/navisol-boat-configurator.git /backup/navisol
```

---

## 📋 COMPLETE BACKUP STRATEGIE

### Dagelijks

- [ ] Git commits maken van wijzigingen
- [ ] Git push naar GitHub

### Wekelijks

- [ ] Database backup maken (JSON export)
- [ ] Backup opslaan op 2 locaties
- [ ] Controleren of Supabase project nog werkt

### Maandelijks

- [ ] Volledige database dump maken
- [ ] Offline backup op externe schijf
- [ ] Test restore van backup (belangrijk!)
- [ ] .env.local backup vernieuwen

### Eenmalig (NU DOEN)

- [ ] Supabase automatische backups activeren (PITR)
- [ ] .env.local veilig opslaan (wachtwoord manager)
- [ ] GitHub branch protection inschakelen
- [ ] Tweede GitHub collaborator toevoegen
- [ ] Backup script maken en testen
- [ ] Disaster recovery plan documenteren

---

## 🚨 DISASTER RECOVERY SCENARIO'S

### Scenario 1: Laptop Crash

**Herstel**:
1. Clone repository van GitHub
2. Installeer dependencies: `bun install`
3. Kopieer .env.local van veilige backup
4. Build en start: `bun run build && bun run start`

**Tijd**: ~15 minuten
**Data verlies**: Geen (als laatste commit gepusht was)

---

### Scenario 2: Supabase Database Corrupt

**Herstel (met PITR)**:
1. Ga naar Supabase Dashboard
2. Settings → Database → Point-in-Time Recovery
3. Kies tijdstip voor herstel
4. Herstel database

**Tijd**: ~5 minuten
**Data verlies**: 0 seconden (tot tijdstip herstel)

**Herstel (zonder PITR, met backup)**:
1. Maak nieuw Supabase project
2. Run migraties: `001_initial_schema.sql`
3. Import backup data (JSON)
4. Update .env.local met nieuwe Supabase URL

**Tijd**: ~30 minuten
**Data verlies**: Alles sinds laatste backup

---

### Scenario 3: GitHub Account Gehackt

**Herstel**:
1. Gebruik lokale git repository
2. Maak nieuw GitHub account
3. Maak nieuwe repository
4. Push code opnieuw:
```bash
git remote set-url origin https://github.com/nieuw-account/navisol.git
git push -u origin master --force
```

**Tijd**: ~10 minuten
**Data verlies**: Geen (als lokale kopie actueel was)

---

## ✅ MINIMALE BACKUP VEREISTEN

**Om business continuïteit te garanderen MOET je hebben**:

1. ✅ **Code op GitHub** - GEDAAN
2. ⚠️ **Database backups** - TE DOEN
3. ⚠️ **.env.local veilig opgeslagen** - TE DOEN
4. ⚠️ **Backup getest (restore test)** - TE DOEN

---

## 🎯 ACTIELIJST (NU UITVOEREN)

### Hoogste Prioriteit (Deze Week)

1. **Supabase Backup Activeren**
   - [ ] Upgrade naar Pro plan ($25/maand)
   - [ ] Activeer PITR backups
   - OF
   - [ ] Maak handmatig backup script
   - [ ] Eerste backup maken en opslaan

2. **.env.local Backup**
   - [ ] Kopieer naar wachtwoord manager
   - [ ] Maak encrypted kopie op cloud
   - [ ] Test of je bij backup kunt

3. **GitHub Beveiliging**
   - [ ] Branch protection inschakelen
   - [ ] Repository private maken (als nog niet)

### Middelhoge Prioriteit (Deze Maand)

4. **Backup Script**
   - [ ] Maak `scripts/backup-database.ts`
   - [ ] Test backup maken
   - [ ] Test restore van backup

5. **Tweede Backup Locatie**
   - [ ] Clone repository op tweede computer
   - [ ] Externe schijf backup

6. **Documentatie**
   - [ ] Disaster recovery plan documenteren
   - [ ] Backup instructies voor team

---

## 💡 AANBEVELINGEN

### Voor Productie Gebruik

1. **Betaalde Supabase Plan** ($25/maand)
   - Automatische daily backups
   - Point-in-Time Recovery
   - Betere performance
   - Meer support

2. **CI/CD Pipeline**
   - Automatisch deployen bij git push
   - Automatische tests draaien
   - Vercel/Netlify deployment

3. **Monitoring**
   - Sentry voor error tracking
   - Uptime monitoring (UptimeRobot)
   - Performance monitoring

4. **Meerdere Environments**
   - Development (lokaal)
   - Staging (test environment)
   - Production (live)

---

## 📞 SUPPORT

Als je hulp nodig hebt met:

- **Supabase backups**: support@supabase.com
- **GitHub issues**: support@github.com
- **Same development**: support@same.new

---

## 🔒 BEVEILIGING CHECKLIST

- [ ] .env.local NIET in GitHub
- [ ] Supabase RLS policies actief
- [ ] GitHub repository private
- [ ] Sterke wachtwoorden gebruikt
- [ ] 2FA ingeschakeld op GitHub
- [ ] 2FA ingeschakeld op Supabase
- [ ] Team heeft alleen noodzakelijke toegang

---

*Backup Checklist - NAVISOL v4*
*Versie: 1.0*
*Datum: 10 maart 2026*
*Status: Actie vereist - zie actielijst*
