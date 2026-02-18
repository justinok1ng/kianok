export default async function handler(req, res) {
  // 1. Configurações para permitir que o site converse com a API
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // Responde rápido se o navegador estiver apenas checando permissão
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Só aceita POST (envio de dados)
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  try {
    const { amount, buyerName, buyerPhone } = req.body;

    // 🔒 PEGA A CHAVE SECRETA NAS CONFIGURAÇÕES DA VERCEL
    const SECRET_KEY = process.env.ABACASH_SECRET;

    // Se não tiver a chave configurada, avisa o erro
    if (!SECRET_KEY) {
        console.error("ERRO: ABACASH_SECRET não encontrada.");
        return res.status(500).json({ error: "Configuração de API ausente" });
    }

    // Tratamento básico do CPF (usando o telefone pois seu form não pede CPF)
    let fakeCpf = buyerPhone.replace(/\D/g, "");
    // Garante 11 dígitos preenchendo com zeros se precisar
    if (fakeCpf.length < 11) fakeCpf = fakeCpf.padEnd(11, '0'); 
    if (fakeCpf.length > 11) fakeCpf = fakeCpf.slice(0, 11);

    const bodyToSend = {
        action: "create",
        product_id: "5niic0v1c", // SEU PRODUTO NOVO
        amount: Number(amount),  // VALOR VARIÁVEL QUE VEM DO SITE
        customer: {
          name: buyerName || "Cliente",
          cpf: fakeCpf, 
          email: "cliente@email.com",
          phone: buyerPhone.replace(/\D/g, "")
        }
    };

    console.log("Enviando para Abacash:", JSON.stringify(bodyToSend));

    // Usamos 'fetch' nativo (padrão Vercel) para não precisar instalar 'axios'
    const response = await fetch("https://app.abacash.com/api/payment.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SECRET_KEY}`
      },
      body: JSON.stringify(bodyToSend)
    });

    const data = await response.json();
    console.log("Resposta Abacash:", data);

    if (!response.ok || data.error) {
      return res.status(400).json({ 
          error: "Erro na operadora", 
          detail: data.message || "Falha ao criar PIX" 
      });
    }

    // 🏆 AQUI ESTÁ O SEGREDO: Devolver os dados para o seu HTML ler
    return res.status(200).json({
      // A Abacash pode variar o nome do campo, aqui garantimos pegar qualquer um
      copiaecola: data.pix_code || data.qrcode_text || data.payload || "", 
      qrCodeBase64: data.qr_code_base64 || data.qrcode_image || null,
      qrCodeUrl: data.qr_code || data.qrcode_link || null,
      expiresInSeconds: 600
    });

  } catch (error) {
    console.error("Erro Fatal:", error);
    return res.status(500).json({ error: "Erro interno", detail: error.message });
  }
}
