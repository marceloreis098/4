# Gerenciador de Inventário Pro

Este é um guia completo para a instalação e configuração do sistema Gerenciador de Inventário Pro em um ambiente de produção interno. A aplicação utiliza uma arquitetura full-stack com um frontend em React, um backend em Node.js (Express) e um banco de dados MariaDB rodando em um servidor Ubuntu.

## Arquitetura

-   **Backend (API):** Roda na porta **3001** e se comunica com o banco de dados.
-   **Frontend:** Roda na porta **3000** e faz requisições para a API na porta 3001.
-   **Banco de Dados:** MariaDB rodando localmente.

A estrutura de diretórios do projeto é a seguinte:
```
/var/www/Inventario/
├── inventario-api/         <-- Backend (API Node.js)
└── ...                     <-- Frontend (React)
```

---

## Passo a Passo para Instalação

Siga estes passos para configurar e executar a aplicação.

### Passo 0: Obtendo os Arquivos da Aplicação com Git

1.  **Crie o Diretório de Trabalho:**
    ```bash
    sudo mkdir -p /var/www
    sudo chown -R $USER:$USER /var/www
    ```

2.  **Instale o Git:**
    ```bash
    sudo apt update && sudo apt install git
    ```

3.  **Clone o Repositório da Aplicação:**
    Substitua a URL abaixo pela URL real do seu repositório Git.
    ```bash
    cd /var/www/
    git clone https://github.com/marceloreis098/teste4.git Inventario
    ```

### Passo 1: Configuração do Banco de Dados (MariaDB)

1.  **Instale e Proteja o MariaDB Server:**
    ```bash
    sudo apt install mariadb-server
    sudo mysql_secure_installation
    ```

2.  **Crie o Banco de Dados e o Usuário:**
    Acesse o console do MariaDB (`sudo mysql -u root -p`). Substitua `'sua_senha_forte'` por uma senha segura.
    ```sql
    CREATE DATABASE inventario_pro CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    CREATE USER 'inventario_user'@'localhost' IDENTIFIED BY 'sua_senha_forte';
    GRANT ALL PRIVILEGES ON inventario_pro.* TO 'inventario_user'@'localhost';
    FLUSH PRIVILEGES;
    EXIT;
    ```
    
### Passo 2: Configuração do Backend (API)

1.  **Instale o Node.js:**
    ```bash
    curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
    sudo apt-get install -y nodejs
    ```

2.  **Instale as Dependências da API:**
    ```bash
    cd /var/www/Inventario/inventario-api
    npm install
    ```

3.  **Crie o Arquivo de Variáveis de Ambiente (`.env`):**
    ```bash
    # Em /var/www/Inventario/inventario-api
    nano .env
    ```
    Adicione o conteúdo, usando a senha do banco de dados:
    ```
    DB_HOST=localhost
    DB_USER=inventario_user
    DB_PASSWORD=sua_senha_forte
    DB_DATABASE=inventario_pro
    API_PORT=3001
    BCRYPT_SALT_ROUNDS=10
    ```

### Passo 3: Configuração do Frontend

1.  **Instale `serve` e `pm2` globalmente:**
    ```bash
    sudo npm install -g serve pm2
    ```

2.  **Instale as Dependências do Frontend:**
    ```bash
    cd /var/www/Inventario
    npm install 
    ```

3.  **Compile a Aplicação para Produção:**
    Isso cria uma pasta `dist` com a versão otimizada do site.
    ```bash
    npm run build
    ```

### Passo 4: Configuração do Firewall (UFW)

1.  **Adicione as Regras e Habilite:**
    Libere as portas para SSH e para a API do backend (3001). A porta do frontend (3000) não precisa ser liberada publicamente se você for usar um proxy reverso como o Nginx (recomendado no Passo 7).
    ```bash
    sudo ufw allow ssh
    sudo ufw allow 3001/tcp
    sudo ufw enable
    ```
    Se você precisar acessar o frontend diretamente pela porta 3000 para testes (não recomendado para produção), execute também: `sudo ufw allow 3000/tcp`.

### Passo 5: Executando a Aplicação com PM2

`pm2` irá garantir que a API e o frontend rodem continuamente em segundo plano.

1.  **Inicie a API na porta 3001:**
    ```bash
    cd /var/www/Inventario/inventario-api
    pm2 start server.js --name inventario-api
    ```

2.  **Inicie o Frontend na porta 3000:**
    ```bash
    cd /var/www/Inventario
    pm2 start serve --name inventario-frontend -- -s dist -l 3000
    ```

3.  **Configure o PM2 para Iniciar com o Servidor:**
    ```bash
    pm2 startup
    # Execute o comando que o pm2 fornecer na saída
    ```

4.  **Salve a Configuração de Processos:**
    ```bash
    pm2 save
    ```

### Passo 6: Acesso à Aplicação

Abra o navegador e acesse o endereço IP do seu servidor, especificando a porta do frontend **3000**: `http://<ip-do-servidor>:3000`.

---

## Atualizando a Aplicação com Git

Para atualizar a aplicação com novas modificações do repositório:

1.  **Navegue até o diretório do projeto:**
    ```bash
    cd /var/www/Inventario
    ```
2.  **Puxe as atualizações:**
    ```bash
    git pull
    ```
3.  **Reinstale as dependências (se necessário):**
    ```bash
    npm install
    cd inventario-api && npm install && cd ..
    ```
4.  **Recompile o frontend:**
    ```bash
    npm run build
    ```
5.  **Reinicie os processos do `pm2`:**
    ```bash
    pm2 restart inventario-api
    pm2 restart inventario-frontend
    ```

---

## Passo 7 (Alternativa): Configurando HTTPS com Nginx e acme.sh

Esta é uma alternativa robusta ao Certbot. O `acme.sh` é um script leve que não precisa de muitas dependências.

### Pré-requisitos
-   Um nome de domínio (ex: `inventariopro.usereserva.com`) com um registro DNS tipo `A` apontando para o IP público do seu servidor.
-   Acesso `sudo` e as portas 80 e 443 abertas no firewall.

### 1. Instalação do Nginx e Ajuste do Firewall
```bash
sudo apt update
sudo apt install nginx
sudo ufw allow 'Nginx Full'
sudo ufw delete allow 3000/tcp # Se você habilitou anteriormente
sudo ufw status
```

### 2. Preparação da Configuração do Nginx
Primeiro, vamos criar uma configuração simples para o Nginx servir o seu site via HTTP (porta 80). Isso é necessário para o `acme.sh` validar seu domínio.

```bash
sudo nano /etc/nginx/sites-available/inventario
```

Cole esta configuração inicial. **Lembre-se de substituir `inventariopro.usereserva.com` pelo seu domínio.**
```nginx
server {
    listen 80;
    server_name inventariopro.usereserva.com;

    # O diretório root é necessário para o acme.sh realizar a validação
    root /var/www/Inventario/dist;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/ {
        proxy_pass http://localhost:3001/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Ative o site e reinicie o Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/inventario /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```
Neste ponto, você deve conseguir acessar `http://inventariopro.usereserva.com`.

### 3. Instalação do acme.sh
Execute o comando a seguir como seu usuário normal (não como `root`). Substitua pelo seu e-mail.
```bash
curl https://get.acme.sh | sh -s email=seu-email@example.com
```
Após a instalação, feche e reabra seu terminal SSH para que o alias `acme.sh` funcione, ou execute `source ~/.bashrc`.

### 4. Geração do Certificado SSL
Use o `acme.sh` para gerar o certificado. O modo `nginx` irá automaticamente criar um arquivo de validação temporário.
```bash
acme.sh --issue -d inventariopro.usereserva.com --nginx
```

### 5. Instalação do Certificado no Nginx
Este comando copia os arquivos do certificado para um local permanente e configura a renovação automática para recarregar o Nginx.
```bash
sudo mkdir -p /etc/nginx/ssl
acme.sh --install-cert -d inventariopro.usereserva.com \
--key-file       /etc/nginx/ssl/inventariopro.usereserva.com.key  \
--fullchain-file /etc/nginx/ssl/inventariopro.usereserva.com.cer \
--reloadcmd     "sudo systemctl reload nginx"
```

### 6. Atualização Final da Configuração do Nginx
Agora, edite novamente o arquivo de configuração do Nginx para adicionar o bloco HTTPS.
```bash
sudo nano /etc/nginx/sites-available/inventario
```

Substitua **todo o conteúdo** pelo seguinte. Isso redirecionará HTTP para HTTPS e ativará o SSL.
```nginx
# Redireciona HTTP para HTTPS
server {
    listen 80;
    server_name inventariopro.usereserva.com;
    return 301 https://$host$request_uri;
}

# Configuração do servidor HTTPS
server {
    listen 443 ssl http2;
    server_name inventariopro.usereserva.com;

    # Caminhos para os certificados gerados pelo acme.sh
    ssl_certificate /etc/nginx/ssl/inventariopro.usereserva.com.cer;
    ssl_certificate_key /etc/nginx/ssl/inventariopro.usereserva.com.key;

    # Aumenta o limite de tamanho para uploads
    client_max_body_size 10M;

    # Proxy para o Frontend React
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Proxy para o Backend Node.js
    location /api/ {
        proxy_pass http://localhost:3001/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 7. Finalização
Teste a configuração e reinicie o Nginx pela última vez.
```bash
sudo nginx -t
sudo systemctl restart nginx
```
Pronto! Sua aplicação agora deve estar segura e acessível via `https://inventariopro.usereserva.com`. O `acme.sh` cuidará da renovação automaticamente.