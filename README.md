# OrderSync

**OrderSync** é um sistema distribuído baseado em microsserviços, desenvolvido com foco em escalabilidade, integração assíncrona e arquitetura desacoplada. O projeto implementa fluxo completo de pedidos, pagamentos e notificações utilizando as tecnologias exigidas em ambientes de produção modernos.

---

## 📦 Tecnologias Utilizadas

- **PHP 8.0** + **Laravel 6.10**
- **MySQL**
- **MongoDB** (para logs de notificação)
- **RabbitMQ**
- **Docker + Docker Compose**
- **Ext JS (Classic Toolkit)**
- **JWT (autenticação stateless)**
- **GitHub Actions (CI)**
- **Arquitetura de Microsserviços**
- **API Gateway (Laravel)**
- **CORS Middleware (Fruitcake/laravel-cors)**

---

## 🧩 Estrutura dos Serviços

| Serviço             | Porta  | Função                                                   |
|---------------------|--------|-----------------------------------------------------------|
| `api-gateway`       | 8000   | Roteador e autenticador central de requisições HTTP       |
| `order-service`     | 8001   | CRUD de pedidos                                           |
| `payment-service`   | 8002   | Processamento de pagamentos                               |
| `notification-service` | 8003 | Geração e leitura de notificações (logs via MongoDB)     |
| `frontend`          | 8080   | Interface de administração desenvolvida com Ext JS        |
| `rabbitmq`          | 5672   | Broker de mensageria entre os serviços                    |
| `mysql`             | 3306   | Banco relacional para pedidos e pagamentos                |
| `mongo`             | 27017  | Banco NoSQL para armazenar notificações                   |

---

## 🚀 Funcionalidades

- Login com e-mail e senha, utilizando JWT
- Cadastro de pedidos com autenticação protegida
- Visualização de pedidos, pagamentos e notificações em abas
- Comunicação assíncrona entre microsserviços via RabbitMQ
- Armazenamento de logs em MongoDB
- Integração automática de token JWT via `Ext.Ajax.on('beforerequest')`

---

## 📁 Instruções de Uso

### 1. Clonar o projeto

```bash
git clone https://github.com/seuusuario/ordersync.git
cd ordersync
```

### 2. Subir os containers

```bash
docker-compose up -d --build
```

### 3. Acessar os sistemas

- **Frontend (Ext JS):** [http://localhost:8080](http://localhost:8080)
- **API Gateway:** [http://localhost:8000](http://localhost:8000)

---

## 🖥️ Acesso Padrão

> Para testar, utilize credenciais cadastradas diretamente via seed ou migrations nas tabelas de usuários.

---

## 🛠️ Comandos úteis

### Rodar o servidor de desenvolvimento Ext JS

```bash
cd frontend/OrderSyncApp
sencha app watch
```

### Gerar a build de produção do frontend

```bash
sencha app build production
```

---

## ✅ Status Atual

- [x] Autenticação com JWT
- [x] Microsserviços funcionais (order, payment, notification)
- [x] Integração via RabbitMQ
- [x] CORS configurado
- [x] CI básico com GitHub Actions
- [ ] Interface Ext JS com login + abas
- [ ] Testes unitários
- [ ] Observabilidade com Datadog ou ELK
- [ ] Logout e expiração de sessão

---

## 📄 Licença

GPLv3 para fins educacionais e de demonstração técnica.