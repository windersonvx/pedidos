# Sistema de Webhook Braip com Supabase - Integração Completa

## 🚀 Recursos Implementados

### ✅ **Webhook Braip com Supabase**
- **Endpoint**: `/webhook-braip` ou `/api/webhook-braip`
- **Banco de Dados**: Supabase PostgreSQL
- **Persistência**: Dados salvos automaticamente no banco
- **Fallback**: Sistema local como backup

### ✅ **Atualizações em Tempo Real**
- **Server-Sent Events (SSE)**: `/api/orders/updates`
- **Conexão Persistente**: Interface atualiza automaticamente
- **Reconexão Automática**: Sistema robusto contra quedas de conexão
- **Notificações**: Toast alerts para atualizações

### ✅ **Gerenciamento Completo de Pedidos**
- **CRUD Completo**: Criar, ler, atualizar, deletar
- **Campos Expandidos**: Telefone, produto, quantidade, valor, observações
- **Drag & Drop**: Mover pedidos entre colunas
- **Busca Avançada**: Por nome, código, status

### ✅ **Integração Dupla**
- **API Local**: Para desenvolvimento e backup
- **API Supabase**: Para produção e persistência
- **Sincronização**: Dados sempre atualizados

## 🛠️ Configuração do Sistema

### 1. **Configuração do Supabase**

1. Execute o script SQL no Supabase:
```sql
-- Ver arquivo: database-setup.sql
```

2. Configure as variáveis de ambiente:
```env
SUPABASE_URL=https://qiecxrvunvgejtaedsfm.supabase.co
SUPABASE_ANON_KEY=3e9a6260f6225f5fc129524940a26c56f9bcea65
```

### 2. **Configuração do Webhook na Braip**

Configure o webhook da Braip para enviar para:
- **URL**: `https://seu-dominio.com/webhook-braip`
- **Método**: POST
- **Content-Type**: application/json

### 3. **Endpoints Disponíveis**

#### Webhook Braip
```
POST /webhook-braip
POST /api/webhook-braip
```

#### Gerenciamento de Pedidos
```
GET  /api/orders-supabase     # Buscar pedidos do Supabase
POST /api/orders-supabase     # Criar/atualizar pedido
GET  /api/orders/updates      # SSE para atualizações em tempo real
```

#### Backup/Local
```
GET  /api/orders              # Buscar pedidos locais
POST /api/orders              # Criar/atualizar pedido local
```

## 📡 **Fluxo de Dados**

```
Braip Webhook → Servidor → Supabase → SSE → Frontend
                    ↓
               Cache Local (Backup)
```

1. **Webhook Braip** envia dados para o servidor
2. **Servidor** valida e processa os dados
3. **Supabase** armazena os dados persistentemente
4. **SSE** envia atualizações em tempo real para todos os clientes conectados
5. **Frontend** atualiza automaticamente a interface

## 🔧 **Estrutura dos Dados**

### Payload do Webhook Braip
```json
{
  "buyer_name": "Nome do Cliente",
  "purchase_id": "PED123",
  "tracking_code": "BR123456789",
  "status": "PAGAMENTO_CONFIRMADO",
  "updated_at": "2024-01-28T10:30:00Z"
}
```

### Mapeamento de Status
```javascript
{
  'PAGAMENTO_CONFIRMADO': 'placed',        // Pedido Agendado
  'EM_ANDAMENTO': 'progress',              // Pedido em Andamento
  'POSTADO': 'pickup',                     // Pedido Aguardando Retirada
  'AGUARDANDO_RETIRADA': 'pickup',         // Pedido Aguardando Retirada
  'ENTREGUE': 'delivered',                 // Pedido Entregue e Pago
  'FRUSTRADO': 'failed',                   // Pedido Frustrado
  'NAO_RETIRADO': 'failed'                 // Pedido Frustrado
}
```

## 🚀 **Como Testar**

### 1. **Teste Manual do Webhook**
```bash
curl -X POST http://localhost:8080/webhook-braip \
  -H "Content-Type: application/json" \
  -d '{
    "buyer_name": "Teste Cliente",
    "purchase_id": "TEST123",
    "tracking_code": "BR123456789",
    "status": "PAGAMENTO_CONFIRMADO",
    "updated_at": "2024-01-28T10:30:00Z"
  }'
```

### 2. **Verificar Conexão SSE**
```javascript
// No console do navegador
const eventSource = new EventSource('/api/orders/updates');
eventSource.onmessage = (event) => {
  console.log('Received:', JSON.parse(event.data));
};
```

### 3. **Verificar Supabase**
```bash
curl -X GET "https://qiecxrvunvgejtaedsfm.supabase.co/rest/v1/pedidos" \
  -H "apikey: 3e9a6260f6225f5fc129524940a26c56f9bcea65"
```

## 🔒 **Segurança**

- **Validação**: Zod schema para validar payloads
- **Rate Limiting**: Implementar conforme necessário
- **CORS**: Configurado para desenvolvimento
- **RLS**: Row Level Security no Supabase
- **API Keys**: Gerenciadas via variáveis de ambiente

## 📊 **Monitoramento**

- **Logs**: Console logs detalhados
- **Status**: Indicadores visuais de conexão
- **Fallback**: Sistema de backup automático
- **Reconnect**: Reconexão automática em caso de falha

## 🚀 **Deploy**

O sistema está pronto para deploy em qualquer plataforma que suporte Node.js:
- **Vercel**
- **Netlify Functions**
- **Heroku**
- **Railway**
- **AWS Lambda**

## 📱 **Interface do Usuário**

### Recursos Visuais
- ✅ Status de conexão em tempo real
- ✅ Indicadores visuais por coluna
- ✅ Notificações de atualização
- ✅ Busca e filtros avançados
- ✅ Drag & drop entre colunas
- ✅ Formulários completos
- ✅ Layout responsivo

### Colunas do Kanban
1. **Pedido Agendado** (Branco/Cinza)
2. **Pedido em Andamento** (Azul)
3. **Pedido Aguardando Retirada** (Amarelo)
4. **Pedido Entregue e Pago** (Verde + ✓)
5. **Pedido Entregue e Não Pago** (Laranja)
6. **Pedido Frustrado** (Vermelho)

O sistema agora oferece uma solução completa para gerenciamento de pedidos em tempo real com integração total Braip + Supabase!
