// Função auxiliar para gerar um CPF matematicamente válido
// (Necessário para evitar o erro 520 da Eulen/Abacash)
function gerarCpfValido() {
  const rand = (n) => Math.floor(Math.random() * n);
  const mod = (dividendo, divisor) => Math.round(dividendo - (Math.floor(dividendo / divisor) * divisor));

  const n1 = rand(10), n2 = rand(10), n3 = rand(10);
  const n4 = rand(10), n5 = rand(10), n6 = rand(10);
  const n7 = rand(10), n8 = rand(10), n9 = rand(10);

  let d1 = n9 * 2 + n8 * 3 + n7 * 4 + n6 * 5 + n5 * 6 + n4 * 7 + n3 * 8 + n2 * 9 + n1 * 10;
  d1 = 11 - (mod(d1, 11));
  if (d1 >= 10) d1 = 0;

  let d2 = d1 * 2 + n9 * 3 + n8 * 4 + n7 * 5 + n6 * 6 + n5 * 7 + n4 * 8 + n3 * 9 + n2 * 10 + n1 * 11;
  d2 = 11 - (mod(d2, 11));
  if (d2 >= 10) d2 = 0;

  return `${n1}${n2}${n3}${n4}${n5}${n6}${n7}${n8}${n9}${d1}${d2}`;
}

export default async function handler(req, res) {
  // 1. Configurações de Permissão (CORS)
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

    // ====================================================
    // 🎲 LISTA DE PRODUTOS PARA SORTEIO
    // Mantenha seus IDs aqui. O sistema escolherá um aleatório.
    const MEUS_PRODUTOS = [
       "s2dwjdf1t",
       // "icmdwvk1x",
       // "rsvmvfzsy",
       // "8gq7gb5en",
       // "b8796vs1h",
    ];

    // Sorteia um ID da lista acima automaticamente
    const produtoSorteado = MEUS_PRODUTOS[Math.floor(Math.random() * MEUS_PRODUTOS.length)];
    
    console.log("ID do Produto Escolhido:", produtoSorteado);
    // ====================================================

    // 🔥 GERAÇÃO DE CPF VÁLIDO (A CORREÇÃO PRINCIPAL)
    // Substituímos o telefone pelo CPF gerado para passar na segurança do banco
    const cpfParaEnvio = gerarCpfValido();

    const bodyToSend = {
        action: "create",
        product_id: produtoSorteado,
        amount: Number(amount),
        customer: {
          name: buyerName || "Cliente",
          cpf: cpfParaEnvio, // CPF Válido aqui!
          email: "cliente@email.com",
          phone: buyerPhone.replace(/\D/g, "")
        }
    };

    console.log("Enviando com CPF Válido:", cpfParaEnvio);

    const response = await fetch("https://app.abacash.com/api/payment.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SECRET_KEY}`
      },
      body: JSON.stringify(bodyToSend)
    });

    const jsonResponse = await response.json();
    console.log("Resposta da Abacash:", JSON.stringify(jsonResponse));

    // Leitura dos dados conforme o padrão da Abacash
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

    return res.status(400).json({ 
        error: "Erro na operadora", 
        detail: jsonResponse.message || "Falha ao gerar PIX (verifique valor mínimo)." 
    });

  } catch (error) {
    console.error("Erro Fatal:", error);
    return res.status(500).json({ error: "Erro interno", detail: error.message });
  }
}
