# Documentação de Arquitetura - Sistema de Priorização de Manutenção CESAN

## 1. Visão Geral do Sistema

O **Sistema de Priorização de Manutenção CESAN** é uma aplicação web *Single Page Application* (SPA) desenvolvida para substituir scripts Python/Streamlit, oferecendo uma interface moderna, responsiva e acessível para a análise de ordens de manutenção (SAP).

O objetivo central do sistema é processar dados históricos de manutenção no navegador do cliente (Client-Side Processing), calcular indicadores de saúde dos equipamentos e gerar um **Score de Prioridade** para auxiliar na tomada de decisão.

---

## 2. Stack Tecnológico

*   **Core:** React 18 (Hooks, Functional Components).
*   **Linguagem:** TypeScript 5 (Tipagem estrita para garantir segurança matemática).
*   **Processamento de Dados:** SheetJS (`xlsx`) para parsing de arquivos Excel.
*   **Estilização:** Tailwind CSS (Utilitários para layout responsivo e design system governamental).
*   **Ícones:** Lucide React.
*   **Gerenciamento de Estado:** React `useState` / `useMemo` (Local State).

---

## 3. Arquitetura de Dados (Pipeline de Processamento)

Diferente de sistemas web tradicionais que enviam arquivos para um backend, este sistema realiza todo o processo de **ETL (Extract, Transform, Load)** diretamente no navegador do usuário. Isso garante privacidade (os dados não saem da máquina) e performance instantânea após o carregamento.

O pipeline é executado em `src/utils/excelProcessor.ts` e segue estritamente a lógica do `pandas` do Python:

### Passo 1: Ingestão e Validação (Extract)
1.  O usuário carrega o arquivo `.xlsx`.
2.  O sistema verifica a existência das abas obrigatórias: `Ordens Abertas` e `Ordens Encerradas`.
3.  Os dados são convertidos de binário para JSON bruto.

### Passo 2: Limpeza e Agrupamento (Transform - Stage A)
Os dados brutos são iterados e agrupados por `Denominação Equipamento`.
**Regras de Exclusão (Saneamento):**
*   **Inconsistência Temporal:** Se `Data Encerramento` < `Data Entrada`, o registro é descartado.
*   **Outliers/Dados Antigos:** Se o tempo de resolução for > 1095 dias (3 anos), o registro é descartado para não distorcer a média.
*   **Dados Faltantes:** Registros sem Nome ou Datas válidas são ignorados.

### Passo 3: Engenharia de Atributos (Transform - Stage B)
Para cada equipamento, calculamos as métricas brutas (Raw Metrics).
*   **Frequência Anual:** `Total Ordens / (Dias de Histórico / 365)`.
*   **Tempo Médio de Reparo (Downtime):** Média aritmética simples dos dias para resolver cada ordem.
*   **Tendência (6 meses):**
    *   Define-se janela de 180 dias (`cutoff6m`) e 360 dias (`cutoff12m`) a partir de hoje.
    *   `Tendência = (Qtd Ordens Últimos 6m) - (Qtd Ordens 6m Anteriores)`.
    *   *Nota:* O cálculo de datas utiliza milissegundos exatos para paridade com `pandas.Timedelta`.
*   **Negligência:** Dias decorridos entre a data atual e a data da última ordem encerrada.
*   **Variabilidade (Confiança):**
    *   Calculada via Coeficiente de Variação (CV).
    *   Usa **Desvio Padrão Amostral (N-1)** para paridade estrita com `pandas.std()`.
*   **Média de Intervalos (MTBF Estimado):**
    *   Calcula a diferença em dias entre ordens consecutivas.
    *   **Importante:** Intervalos de 0 dias são descartados da média (conforme lógica Python original).

### Passo 4: Normalização Global (Transform - Stage C)
Para calcular o Score, precisamos colocar todas as métricas na mesma escala (0 a 100).
1.  O sistema percorre **todos** os equipamentos processados para encontrar os valores **Mínimo Global** e **Máximo Global** de cada atributo (Frequência, Downtime, Tendência, Negligência).
2.  Aplica-se a fórmula de normalização Min-Max linear:
    ```typescript
    ScoreAtributo = ((Valor - MinGlobal) / (MaxGlobal - MinGlobal)) * 100
    ```
    *Isso garante que o equipamento com a maior frequência do dataset receba nota 100 em frequência, e o menor receba 0.*

### Passo 5: Cálculo do Score Final e Classificação (Transform - Stage D)
O Score Final é uma média ponderada dos atributos normalizados.

**Pesos:**
*   **Frequência:** 35% (0.35)
*   **Tempo de Reparo:** 30% (0.30)
*   **Tendência:** 20% (0.20)
*   **Negligência:** 10% (0.10)
*   **Obsolescência:** -5% (-0.05) [Penalidade se > 540 dias sem ordem]

**Fórmula Final:**
```typescript
ScoreFinal = (FreqNorm * 0.35) + (DowntimeNorm * 0.30) + (TendenciaNorm * 0.20) + (NegligenciaNorm * 0.10) + (Obsolescencia * -0.05)
```

**Classificação (Criticidade):**
*   **CRÍTICO:** Score ≥ 75
*   **ALTO:** 50 ≤ Score < 75
*   **MÉDIO:** 25 ≤ Score < 50
*   **BAIXO:** Score < 25

### Passo 6: Predição (Load)
Baseada na estatística simples de recorrência:
```typescript
DiasParaFalha = MédiaIntervalos - DiasDesdeUltimaOrdem
```
*   **ATRASADO:** Se `DiasParaFalha` ≤ 0.
*   **PREOCUPANTE:** Se `DiasParaFalha` entre 1 e 30.
*   **OK:** Se `DiasParaFalha` > 30.
*   **SEM HISTÓRICO:** Se houver menos de 2 ordens (impossível calcular intervalo).

---

## 4. Estrutura de Diretórios

```
/
├── src/
│   ├── components/
│   │   ├── DetailDrawer.tsx    # Painel lateral com detalhes técnicos
│   │   ├── EquipmentTable.tsx  # Tabela principal com paginação e tooltips
│   │   ├── StatCard.tsx        # Cartões de KPI do topo
│   │   └── StatusBadge.tsx     # Badges coloridos (Criticidade/Predição)
│   ├── utils/
│   │   └── excelProcessor.ts   # O "CÉREBRO" - Toda lógica matemática reside aqui
│   ├── App.tsx                 # Controlador principal e Layout
│   ├── types.ts                # Definições de Tipos TypeScript (Interfaces)
│   ├── index.tsx               # Ponto de entrada React
│   └── index.html              # Entrypoint HTML
├── metadata.json               # Configurações do ambiente
└── ARCHITECTURE.md             # Este arquivo
```

---

## 5. Decisões de Design e UX

### 5.1. Interface "Governamental/Enterprise"
Optou-se por um design limpo, de alto contraste (fundo `slate-50`, textos `slate-900`, azul institucional `brand-600`), priorizando a legibilidade de dados densos sobre efeitos visuais desnecessários.

### 5.2. Tooltips Educativos
Devido à complexidade dos cálculos (ex: predição baseada em variabilidade histórica), foram implementados tooltips nos cabeçalhos e células da tabela. Eles traduzem a matemática para linguagem de negócio (ex: "Venceu há X dias").

### 5.3. Performance em Tabelas Grandes
Para lidar com datasets de milhares de linhas sem travar o navegador:
*   Implementação de **Paginação** no client-side.
*   Uso de `useMemo` para recalcular filtros apenas quando necessário, evitando re-renderizações pesadas.

---

## 6. Guia de Manutenção e Extensão

### Como alterar os Pesos do Score?
Vá em `src/utils/excelProcessor.ts` e altere o objeto constante `PESOS` no topo do arquivo. A lógica de cálculo consumirá os novos valores automaticamente.

### Como alterar os Limites de Criticidade?
Vá em `src/utils/excelProcessor.ts` e altere o objeto `LIMITES`.

### Como adicionar nova coluna do Excel?
1.  Atualize a interface `RawOrderClosed` em `src/types.ts`.
2.  No `excelProcessor.ts`, adicione o campo no mapeamento dentro do loop `rawClosed.forEach`.
