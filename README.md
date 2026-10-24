# Zisch

Softdrinks einchecken wie bei Untappd: Barcode scannen, mit 0 bis 5 Kronkorken bewerten, kommentieren, Fotos teilen, Prost sagen und Abzeichen sammeln. Selbst gehostet, ein einziger Docker-Container, keine externe Datenbank.

**Funktionen**

- Konten mit Benutzername und Passwort, Registrierung nur mit Einladungscode
- Live-Barcode-Scan mit der Handykamera (braucht HTTPS), alternativ per Foto oder Nummer eintippen
- Unbekannte Barcodes werden automatisch bei [Open Food Facts](https://world.openfoodfacts.org) nachgeschlagen und können mit einem Tipp übernommen werden
- Feed mit Prost und Kommentaren, Drink- und Hersteller-Seiten, Bestenliste, Profile mit 19 Abzeichen, private Merkliste
- Startkatalog mit 38 bekannten Softdrinks
- Lässt sich am Handy als App auf den Startbildschirm legen

---

## Installation mit Portainer

### 1. Stack anlegen

1. In Portainer: **Stacks → Add stack**
2. Name: `zisch`
3. Build method: **Repository**
4. Repository URL: `https://github.com/juliangross98/zisch`
5. Repository reference: `refs/heads/main`
6. Compose path: `docker-compose.yml`
7. Unter **Environment variables** hinzufügen:

   | Name | Wert | Pflicht |
   |---|---|---|
   | `INVITE_CODE` | ein Code eurer Wahl, z. B. `sprudel-2026` | ja |
   | `ZISCH_PORT` | Port auf dem Server, Standard `8085` | nein |

8. **Deploy the stack**. Der erste Build dauert ein bis zwei Minuten.

Danach läuft Zisch unter `http://<server-ip>:8085`.

### 2. Nginx Proxy Manager (HTTPS)

Die Live-Kamera funktioniert im Browser nur über HTTPS. So richtest du es ein:

1. **Hosts → Proxy Hosts → Add Proxy Host**
2. Domain Names: z. B. `zisch.deine-domain.de`
3. Scheme: `http`
4. Forward Hostname / IP: die IP deines Servers (oder `zisch`, wenn NPM im selben Docker-Netzwerk hängt, dann Port `3000`)
5. Forward Port: `8085`
6. **Block Common Exploits** einschalten
7. Reiter **SSL**: „Request a new SSL Certificate“, **Force SSL** und **HTTP/2 Support** einschalten
8. Speichern

### 3. Erstes Konto

Öffne die Seite, wähle **Registrieren** und gib den Einladungscode ein. **Das erste Konto wird automatisch Admin** und darf alle Check-ins, Kommentare und unbenutzte Drinks löschen. Danach schickst du deinen Freunden Link und Einladungscode.

---

## Updates

In Portainer den Stack öffnen und **Pull and redeploy** klicken. Daten bleiben erhalten, sie liegen im Volume.

Optional unter „GitOps updates“ automatische Aktualisierung einschalten, dann holt Portainer neue Versionen aus dem Repo selbst.

## Backup

Alle Daten liegen im Docker-Volume `zisch_zisch-data`:

- `zisch.db` – Konten, Drinks, Check-ins, Kommentare (SQLite)
- `uploads/` – Fotos und Profilbilder

Sichern, z. B. per SSH auf dem Server:

```sh
docker run --rm -v zisch_zisch-data:/data -v "$PWD":/backup alpine \
  tar czf /backup/zisch-backup-$(date +%F).tar.gz -C /data .
```

## Einstellungen

| Variable | Standard | Bedeutung |
|---|---|---|
| `INVITE_CODE` | – | Code zum Registrieren. Ohne Code kann sich nur das allererste Konto anlegen. |
| `ZISCH_PORT` | `8085` | Port auf dem Server |
| `OPENFOODFACTS` | `true` | Unbekannte Barcodes bei Open Food Facts nachschlagen |
| `COOKIE_SECURE` | `auto` | `auto` erkennt HTTPS über den Proxy. `true` erzwingt sichere Cookies. |
| `TRUST_PROXY` | `true` | Proxy-Header (`X-Forwarded-*`) auswerten, passt für Nginx Proxy Manager |

Den Einladungscode kannst du jederzeit in Portainer ändern und den Stack neu deployen. Bestehende Konten bleiben gültig.

## Datenschutz

Schriften und Barcode-Leser werden aus dem Container ausgeliefert, nicht von Google oder einem CDN. Externe Anfragen gibt es nur bei unbekannten Barcodes: Der Server fragt dann Open Food Facts, und der Browser lädt das Produktbild von `images.openfoodfacts.org`. Mit `OPENFOODFACTS=false` lässt sich das abschalten.

Fotos werden im Browser auf maximal 1600 Pixel verkleinert und als JPEG neu gespeichert. Dabei gehen Metadaten wie der Aufnahmeort verloren.

## Technik

- Node.js 22 mit eingebautem HTTP-Server und SQLite (`node:sqlite`), keine nativen Abhängigkeiten, läuft auch auf ARM (z. B. Raspberry Pi)
- Oberfläche ohne Framework in `public/`
- Server und API in `server/server.js`

Lokal starten (Node 22.13 oder neuer):

```sh
npm install
INVITE_CODE=test npm start
# http://localhost:3000
```
