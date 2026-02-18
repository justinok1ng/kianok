// Função para gerar CPF válido (obrigatório para passar no banco)
function gerarCpfValido() {
  const n = () => Math.floor(Math.random() * 9);
  const n1 = n(), n2 = n(), n3 = n(), n4 = n(), n5 = n(), n6 = n(), n7 = n(), n8 = n(), n9 = n();
  let d1 = n9*2+n8*3+n7*4+n6*5+n5*6+n4*7+n3*8+n2*9+n1*10; d1 = 11 - (d1 % 11); if (d1 >= 10) d1 = 0;
  let d2 = d1*2+n9*3+n8*4+n7*5+n6*6+n5*7+n4*8+n3*9+n2*10+n1*11; d2 = 11 - (d2 % 11); if (d2 >= 10) d2 = 0;
  return `${n1}${n2}${n3}${n4}${n5}${n6}${n7}${n8}${n9}${d1}${d2}`;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const TOKEN = process.env.DICE_TOKEN;
  if (!TOKEN) return res.status(500).json({ error: "DICE_TOKEN não configurado na Vercel" });

  // === MODO 1: VERIFICAR STATUS (GET) ===
  if (req.method === "GET") {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: "ID da transação necessário" });

    try {
      const response = await fetch(`https://api.use-dice.com/api/v1/transactions/getStatusTransac/${id}`, {
        method: "GET",
        headers: { "Authorization": `Bearer ${TOKEN}` }
      });
      const data = await response.json();
      return res.status(200).json(data);
    } catch (error) {
      return res.status(500).json({ error: "Erro ao consultar status" });
    }
  }

  // === MODO 2: CRIAR PIX (POST) ===
  if (req.method === "POST") {
    try {
      const { amount, buyerName, buyerPhone } = req.body;

      // Gera CPF válido para o banco aceitar
      const cpfFake = gerarCpfValido();
      const randomId = Date.now();

      const bodyToSend = {
        product_name: "Pacote de Titulos", // Dice pede nome, não ID
        amount: Number(amount),
        payer: {
          name: buyerName || "Cliente",
          email: `cliente.${randomId}@email.com`,
          document: cpfFake // Envia o CPF gerado
        }
      };

      console.log("Enviando para Dice:", JSON.stringify(bodyToSend));

      const response = await fetch("https://api.use-dice.com/api/v2/payments/deposit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${TOKEN}`
        },
        body: JSON.stringify(bodyToSend)
      });

      const data = await response.json();
      console.log("Resposta Dice:", data);

      if (data.qr_code_text) {
        return res.status(200).json({
          qr_code_text: data.qr_code_text, // Texto puro do PIX
          transaction_id: data.id // ID para consultar status depois
        });
      }

      return res.status(400).json({ error: "Erro Dice", detail: data });

    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Erro interno" });
    }
  }

  return res.status(405).json({ error: "Método não permitido" });
}
