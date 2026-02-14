# Nginx Reverse Proxy con Rate Limiting - Setup Guide

## Panoramica

Questa guida spiega come configurare Nginx come reverse proxy per l'API Natter con rate limiting integrato.

## Rate Limiting: Nginx vs Fastify

### Perché usare entrambi?

| Layer | Nginx | Fastify |
|-------|-------|---------|
| **Posizione** | Edge (primo punto di ingresso) | Application layer |
| **Performance** | Molto veloce (C nativo) | Veloce (JavaScript) |
| **Protezione** | DDoS, flooding di rete | Logic-based attacks |
| **Granularità** | Per IP, per path | Per utente, per sessione, custom logic |

### Strategia Defense in Depth

1. **Nginx** blocca attacchi di volume PRIMA che raggiungano l'app
2. **Fastify** blocca attacchi logici DOPO autenticazione/autorizzazione

## Come Funziona il Rate Limiting in Nginx

### Concetti Base

```nginx
# Definisci una "zona" di memoria condivisa per tracciare richieste
limit_req_zone $binary_remote_addr zone=myzone:10m rate=10r/s;
```

**Spiegazione:**
- `$binary_remote_addr`: Chiave di tracciamento (IP client in formato binario, 4 byte per IPv4)
- `zone=myzone:10m`: Nome zona + 10MB di RAM (traccia ~160k IP diversi)
- `rate=10r/s`: Massimo 10 richieste al secondo

### Burst e nodelay

```nginx
limit_req zone=myzone burst=5 nodelay;
```

**Burst (raffica):**
- Permette 5 richieste extra oltre il rate normale
- Utile per traffico "burstable" (caricamento pagina con risorse multiple)

**Esempio pratico:**

| Scenario | Rate=10r/s, Burst=5 | Risultato |
|----------|---------------------|-----------|
| Client fa 10 req/s costanti | ✅ Tutte passano | Rate normale |
| Client fa 15 req in 1 secondo | ✅ 15 passano | Burst assorbito |
| Client fa 20 req in 1 secondo | ❌ 5 bloccate (429) | Eccede burst |

**nodelay:**
- **Con nodelay**: Burst processato immediatamente
- **Senza nodelay**: Burst messo in coda (aggiunge latenza)

**Raccomandazione**: Usa `nodelay` per API REST (non ha senso ritardare risposte)

## Installazione e Configurazione

### 1. Installa Nginx

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install nginx

# macOS
brew install nginx

# Verifica installazione
nginx -v
```

### 2. Copia la Configurazione

```bash
# Da dentro la directory del progetto natter
sudo cp nginx/natter.conf /etc/nginx/sites-available/natter.conf

# Crea symlink per abilitare
sudo ln -s /etc/nginx/sites-available/natter.conf /etc/nginx/sites-enabled/

# Su macOS (Homebrew Nginx)
cp nginx/natter.conf /usr/local/etc/nginx/servers/natter.conf
```

### 3. Modifica Configurazione (Opzionale)

Apri `/etc/nginx/sites-available/natter.conf` e modifica:

```nginx
server_name api.natter.local localhost;  # Cambia con il tuo dominio
```

### 4. Test Configurazione

```bash
# Verifica sintassi
sudo nginx -t

# Output atteso:
# nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
# nginx: configuration file /etc/nginx/nginx.conf test is successful
```

### 5. Riavvia Nginx

```bash
# Ubuntu/Debian
sudo systemctl restart nginx
sudo systemctl status nginx

# macOS
brew services restart nginx

# Oppure ricarica configurazione senza restart
sudo nginx -s reload
```

### 6. Configura /etc/hosts (Sviluppo Locale)

```bash
# Aggiungi al file /etc/hosts
echo "127.0.0.1 api.natter.local" | sudo tee -a /etc/hosts
```

### 7. Avvia l'App Natter

```bash
npm run dev
```

## Test del Rate Limiting

### Test 1: Rate Limit Generale (100 req/min)

```bash
# Fai 150 richieste rapidamente
for i in {1..150}; do
  curl -s -o /dev/null -w "%{http_code}\n" http://api.natter.local/
done
```

**Risultato atteso:**
- Prime 120 richieste: `200` (100 rate + 20 burst)
- Successive: `429 Too Many Requests`

### Test 2: Rate Limit User Creation (5 req/min)

```bash
# Prova 10 registrazioni rapide
for i in {1..10}; do
  curl -i -X POST http://api.natter.local/users \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"user$i\",\"password\":\"password123\"}"
  echo "---"
done
```

**Risultato atteso:**
- Prime 7 richieste: `201 Created` (5 rate + 2 burst)
- Successive: `429 Too Many Requests`

### Test 3: Verifica Headers

```bash
curl -i http://api.natter.local/

# Dovresti vedere:
# X-RateLimit-Limit: 100
# X-RateLimit-Remaining: 99
# X-RateLimit-Reset: 1234567890
```

## Configurazioni Rate Limiting Spiegate

### Zone 1: General Limit
```nginx
limit_req_zone $binary_remote_addr zone=general_limit:10m rate=100r/m;
```
- **Rate**: 100 richieste/minuto (~1.6 req/sec)
- **Burst**: 20 richieste extra
- **Scopo**: Protegge da flooding generico

### Zone 2: User Creation Limit
```nginx
limit_req_zone $binary_remote_addr zone=user_creation_limit:10m rate=5r/m;
```
- **Rate**: 5 richieste/minuto
- **Burst**: 2 richieste extra
- **Scopo**: Previene spam di registrazioni

### Zone 3: Login Limit (futuro)
```nginx
limit_req_zone $binary_remote_addr zone=login_limit:10m rate=10r/m;
```
- **Rate**: 10 richieste/minuto
- **Burst**: 3 richieste extra
- **Scopo**: Previene brute force su login

### Zone 4: Connection Limit
```nginx
limit_conn_zone $binary_remote_addr zone=conn_limit:10m;
limit_conn conn_limit 10;
```
- **Max**: 10 connessioni simultanee per IP
- **Scopo**: Previene connection exhaustion

## Monitoraggio

### Visualizza Log Rate Limiting

```bash
# Tail dei log Nginx
sudo tail -f /var/log/nginx/natter-error.log

# Cerca rate limiting events
sudo grep "limiting requests" /var/log/nginx/natter-error.log
```

**Esempio output:**
```
2026/02/14 10:30:15 [error] 12345#0: *67 limiting requests, excess: 5.123 by zone "user_creation_limit", client: 192.168.1.100
```

### Statistiche con GoAccess (opzionale)

```bash
# Installa GoAccess
sudo apt install goaccess

# Analizza access log
goaccess /var/log/nginx/natter-access.log -o report.html --log-format=COMBINED
```

## Produzione: HTTPS con Let's Encrypt

### 1. Installa Certbot

```bash
sudo apt install certbot python3-certbot-nginx
```

### 2. Ottieni Certificato SSL

```bash
# Modifica server_name in natter.conf con il tuo dominio
sudo certbot --nginx -d api.natter.com
```

### 3. Auto-Renewal

```bash
# Certbot crea un cron job automatico
sudo certbot renew --dry-run
```

### 4. Decommenta Sezione HTTPS

Nel file `natter.conf`, decommenta il blocco `server { listen 443 ssl http2; ... }`

## Troubleshooting

### Errore: "nginx: [emerg] could not build server_names_hash"

```bash
# Aumenta hash bucket size in /etc/nginx/nginx.conf
http {
    server_names_hash_bucket_size 64;
}
```

### Errore: "connect() failed (111: Connection refused)"

L'app Natter non è in esecuzione su porta 3000:

```bash
# Verifica se l'app è in ascolto
lsof -i :3000

# Avvia l'app
npm run dev
```

### Errore: Port 80 already in use

```bash
# Trova chi usa porta 80
sudo lsof -i :80

# Stoppa servizio in conflitto (es. Apache)
sudo systemctl stop apache2
```

### Rate Limit non funziona

Verifica che le zone siano definite nel blocco `http` (fuori da `server`):

```bash
# Verifica configurazione
sudo nginx -T | grep limit_req_zone
```

## Performance Tuning

### Aumenta Worker Processes

In `/etc/nginx/nginx.conf`:

```nginx
worker_processes auto;  # Usa tutti i core CPU
worker_connections 1024;
```

### Abilita Keepalive

Già configurato in `natter.conf`:

```nginx
keepalive 32;  # Riutilizza connessioni al backend
```

### Aggiungi Caching (opzionale per risposte statiche)

```nginx
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=api_cache:10m inactive=60m;

location /static/ {
    proxy_cache api_cache;
    proxy_cache_valid 200 1h;
    proxy_pass http://natter_backend;
}
```

## Best Practices

1. **Usa rate limits diversi per endpoint diversi** (già implementato)
2. **Monitora i log** per identificare pattern di attacco
3. **Whitelist IP fidati** (uffici, servizi interni)
4. **Combina con fail2ban** per ban automatici
5. **Usa HTTPS in produzione** (sempre!)
6. **Tieni Nginx aggiornato** per patch di sicurezza

## Riferimenti

- [Nginx Rate Limiting Guide](https://www.nginx.com/blog/rate-limiting-nginx/)
- [Nginx Security Best Practices](https://www.nginx.com/blog/mitigating-ddos-attacks-with-nginx-and-nginx-plus/)
- [Let's Encrypt](https://letsencrypt.org/)
