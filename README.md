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

## Passo 7: Configurando HTTPS com Nginx e Let's Encrypt (Recomendado para Produção)

Para garantir a segurança da aplicação, é essencial servi-la via HTTPS. Este guia utiliza o Nginx como um proxy reverso e o Certbot para obter um certificado SSL gratuito da Let's Encrypt.

### Pré-requisitos
-   Um nome de domínio (ex: `inventario.suaempresa.com`) com um registro DNS do tipo `A` apontando para o endereço IP público do seu servidor.
-   Acesso `sudo` ao seu servidor Ubuntu.
-   A aplicação (frontend e backend) deve estar rodando via `pm2` conforme os passos anteriores.

### 1. Instalação do Nginx
```bash
sudo apt update
sudo apt install nginx
```

### 2. Ajuste do Firewall
Permita o tráfego HTTP e HTTPS através do Nginx e remova o acesso direto à porta 3000 do frontend, se você a habilitou anteriormente.
```bash
sudo ufw allow 'Nginx Full'
sudo ufw delete allow 3000/tcp
sudo ufw status
```
A saída deve mostrar `Nginx Full` na lista de regras permitidas.

### 3. Configuração do Nginx como Proxy Reverso
Crie um arquivo de configuração para o seu site. Substitua `inventario.suaempresa.com` pelo seu domínio real.
```bash
sudo nano /etc/nginx/sites-available/inventario
```

Cole a seguinte configuração no arquivo. **Lembre-se de substituir `inventario.suaempresa.com` pelo seu domínio.**
```nginx
server {
    listen 80;
    server_name inventario.suaempresa.com;

    # Redireciona para HTTPS (será configurado pelo Certbot)
    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl http2; # Será configurado pelo Certbot
    server_name inventario.suaempresa.com;

    # Configurações SSL (serão adicionadas pelo Certbot)
    # ssl_certificate /etc/letsencrypt/live/inventario.suaempresa.com/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/inventario.suaempresa.com/privkey.pem;

    # Aumenta o limite de tamanho para uploads de arquivos (ex: fotos de equipamentos)
    client_max_body_size 10M;

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
        
        # Suporte a WebSocket (se necessário no futuro)
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```
**Explicação:**
-   **Bloco `listen 80`:** Captura todo o tráfego HTTP e o redireciona para HTTPS.
-   **Bloco `listen 443 ssl`:** Lida com o tráfego HTTPS.
-   **`location /`:** Redireciona todas as requisições da raiz do site para o frontend React rodando na porta 3000.
-   **`location /api/`:** Redireciona as requisições que começam com `/api/` para o backend Node.js na porta 3001.

### 4. Habilitando a Configuração
Crie um link simbólico para ativar o site, teste a configuração e reinicie o Nginx.
```bash
sudo ln -s /etc/nginx/sites-available/inventario /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 5. Instalando o Certificado SSL com Certbot
O Certbot automatiza a obtenção e renovação de certificados SSL.

1.  **Instale o Certbot:**
    ```bash
    sudo apt install certbot python3-certbot-nginx
    ```
2.  **Obtenha o Certificado:**
    Execute o comando abaixo, substituindo pelo seu domínio. O Certbot irá detectar sua configuração do Nginx, obter o certificado e modificar o arquivo de configuração para usar HTTPS.
    ```bash
    sudo certbot --nginx -d inventario.suaempresa.com
    ```
    -   Siga as instruções na tela.
    -   Quando perguntado sobre redirecionar o tráfego HTTP para HTTPS, escolha a opção **2 (Redirect)**.

Após a conclusão, o Certbot configurará a renovação automática. Seu site estará acessível via `https://inventario.suaempresa.com`.
