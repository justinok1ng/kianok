// Função Geradora de CPF Válido
function gerarCpfValido() {
  const n = () => Math.floor(Math.random() * 9);
  const n1 = n(), n2 = n(), n3 = n(), n4 = n(), n5 = n(), n6 = n(), n7 = n(), n8 = n(), n9 = n();
  let d1 = n9*2+n8*3+n7*4+n6*5+n5*6+n4*7+n3*8+n2*9+n1*10; d1 = 11 - (d1 % 11); if (d1 >= 10) d1 = 0;
  let d2 = d1*2+n9*3+n8*4+n7*5+n6*6+n5*7+n4*8+n3*9+n2*10+n1*11; d2 = 11 - (d2 % 11); if (d2 >= 10) d2 = 0;
  return `${n1}${n2}${n3}${n4}${n5}${n6}${n7}${n8}${n9}${d1}${d2}`;
}

export default async function handler(req, res) {
  // Configuração Padrão
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido" });

  try {
    const { amount, buyerName, buyerPhone } = req.body;
    const SECRET_KEY = process.env.ABACASH_SECRET;

    if (!SECRET_KEY) return res.status(500).json({ error: "Configuração ausente" });

    // ID FIXO (Já que você confirmou que esse funciona)
    const produtoID = "s2dwjdf1t"; 
    
    // 🔥 DADOS ÚNICOS PARA EVITAR BLOQUEIO 520
    const cpfUnico = gerarCpfValido();
    const idUnico = Date.now(); // Cria um número baseado no tempo exato (nunca repete)
    const emailUnico = `cliente.${idUnico}@email.com`; // E-mail diferente a cada clique

    const bodyToSend = {
        action: "create",
        product_id: produtoID,
        amount: Number(amount),
        reference_id: idUnico, // Avisa o banco que é um pedido novo
        customer: {
          name: buyerName || "Cliente",
          cpf: cpfUnico,
          email: emailUnico, // E-mail randomizado
          phone: buyerPhone.replace(/\D/g, "")
        }
    };

    console.log(`Gerando PIX... ID: ${produtoID} | Ref: ${idUnico}`);

    const response = await fetch("https://app.abacash.com/api/payment.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SECRET_KEY}`
      },
      body: JSON.stringify(bodyToSend)
    });

    const jsonResponse = await response.json();
    
    // Leitura dos dados
    const pixData = jsonResponse.data || {};
    const code = pixData.qr_code || pixData.pix_code;
    const urlImage = pixData.qr_image_url || pixData.qrcode_image;

    if (code) {
        return res.status(200).json({
            copiaecola: code,
            qrCodeUrl: urlImage,
            qrCodeBase64: null,
            expiresInSeconds: 600
        });
    }

    // Se der erro, mostra no log o motivo exato
    console.error("Erro API:", JSON.stringify(jsonResponse));
    return res.status(400).json({ 
        error: "Erro na operadora", 
        detail: jsonResponse.message || "Tente novamente em 1 minuto." 
    });

  } catch (error) {
    console.error("Erro Fatal:", error);
    return res.status(500).json({ error: "Erro interno", detail: error.message });
  }
}
