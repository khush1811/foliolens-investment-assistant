# FolioLens

FolioLens is a working investment-assistant prototype for Indian retail investors. Review a fictional INR portfolio, see what drives gains and risk, test a sector move, and ask questions that link back to holdings, fundamentals or news.

## Run the prototype

Clone or download this repository, then open [dist/index.html](dist/index.html) in a modern browser. It runs with sample data and rules-based answers, without an account, API key or installation.

To run the local server with Node.js 20 or later:

~~~powershell
node server.js
~~~

Open **http://127.0.0.1:4173**. Use **Ctrl+C** to stop the server. You can change the port with **$env:PORT = '4180'** before starting. The server is bound to loopback.

## Build and understand it step by step

1. **Start with the data contract.** Open **dist/sample-holdings.csv**. The columns are **ticker**, **shares**, and **avg_cost** in INR. The six fictional securities are defined in **dist/portfolio.js**. Add or change a sample position, import it through the interface, and verify the preview. Duplicate rows merge with a quantity-weighted average cost.
2. **Reconcile the portfolio.** In **dist/portfolio.js**, inspect **portfolio()**. Quantity × demo close gives each position value. Compare that with entered cost for unrealized P&L. The sample must reconcile to ₹250,000 market value, ₹227,060 cost and +₹22,940 unrealized P&L. Run **node --test** after changing the math.
3. **Show risk in rupees.** Open **Risk Lab** and set Technology to −10%. The sector represents 54.72% of the sample portfolio. A 10% drop therefore implies −₹13,680 (−5.472%, displayed as −5.5%) under the stated assumptions. **stress()** uses the same portfolio weights as the dashboard.
4. **Connect evidence.** Open **Holdings → VANTA** to see its dated demo fundamentals. Open **Market News → Held stocks** to see fictional events tagged to current holdings. **dist/app.js** handles the views, import and chart. The chart shows price-only synthetic history with fixed quantities and a fictional benchmark.
5. **Add the assistant.** Ask “What is my biggest risk?”, “Explain VANTA fundamentals”, or “What if Technology drops 10%?”. **infer()** picks a topic and **answer()** formats the evidence. Try “Should I buy VANTA?” to see the educational fallback. Replies use the active portfolio and explicit question text.
6. **Try optional AI routing.** With a provider project and key available, configure the server using the commands below, then enable the switch under **Demo investor → Goals and settings**. **model.js** sends the question to the model for topic classification. The app renders the answer from its own data and falls back to rules if the model is unavailable.
7. **Verify the full flow.** Import a CSV containing only **MERID,12,395** below the header and verify a ₹5,040 value, 100% Financials exposure, and −₹504 under a −10% Financials shock. Reload to confirm persistence. Try an unknown ticker and confirm it leaves the existing portfolio intact. Use **Load sample portfolio** to reset the holdings.

### Optional model configuration on Windows

Run this in PowerShell 7 to enter the key without putting its value in shell history. Replace the model placeholder with a Responses API model from your project that supports Structured Outputs.

~~~powershell
$env:OPENAI_API_KEY = Read-Host 'OpenAI API key' -MaskInput
$env:OPENAI_MODEL = '<your Responses API model>'
node server.js
~~~

The opt-in sends question text to the provider. Keep account identifiers and other personal details out of questions. Holdings are processed in the browser, and the model receives only the question and the supported intent categories. The static demo uses rules mode. [Structured Outputs documentation](https://developers.openai.com/api/docs/guides/structured-outputs)

## Submission and demo

The [submission PDF](output/pdf/FolioLens-PRD.pdf) and [editable PRD](docs/product-requirements.md) cover the user research plan, requirements, journey, wireframes, AI architecture, portfolio formulas, roadmap and KPI definitions.

For a three-minute presentation, start with the sample dashboard. Explain why the 54.7% Technology exposure matters, run the −10% shock, and trace an assistant answer to a company filing or the Risk Lab. Import the one-position CSV to show that the calculations and answers follow the user’s holdings.

The prototype uses fictional prices, fundamentals and news dated 20 November 2026. Licensed market feeds, broker connections, transaction-level returns, alerts and analytics instrumentation are roadmap work.
