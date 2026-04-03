const {
  TELEGRAM_BOT_TOKEN,
  TELEGRAM_CHAT_ID,
  GOLD_API_URL,
  SILVER_API_URL,
  FOREX_API_URL,
  OUNCE_TO_GRAM,
  GST_MULTIPLIER,
} = process.env;

async function fetchPrices() {
  const [goldRes, silverRes, forexRes] = await Promise.all([
    fetch(GOLD_API_URL).then((r) => r.json()),
    fetch(SILVER_API_URL).then((r) => r.json()),
    fetch(FOREX_API_URL).then((r) => r.json()),
  ]);

  return {
    goldUSD: goldRes.price,
    silverUSD: silverRes.price,
    usdInr: forexRes.rates.INR,
    updatedAt: goldRes.updatedAt,
  };
}

function buildMessage({ goldUSD, silverUSD, usdInr, updatedAt }) {
  const ounceToGram = parseFloat(OUNCE_TO_GRAM);
  const gstMultiplier = parseFloat(GST_MULTIPLIER);

  const goldINR = ((goldUSD * usdInr) / ounceToGram) * 10 * gstMultiplier;
  const silverINR = ((silverUSD * usdInr) / ounceToGram) * 1000 * gstMultiplier;

  const formatINR = (num) =>
    Number(num).toLocaleString("en-IN", { maximumFractionDigits: 0 });

  const formatUSD = (num) =>
    Number(num).toLocaleString("en-US", { maximumFractionDigits: 2 });

  const dateObj = new Date(updatedAt);
  const formattedDate = dateObj.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const formattedTime = dateObj
    .toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
    .toUpperCase();

  return (
    `Indian Bullion Update\n` +
    `Gold: ₹${formatINR(goldINR)} (10g) | $${formatUSD(goldUSD)}/oz\n` +
    `Silver: ₹${formatINR(silverINR)} (1kg) | $${formatUSD(silverUSD)}/oz\n` +
    `USD/INR: ${usdInr}\n` +
    `Updated: ${formattedDate}, ${formattedTime}`
  );
}

async function sendTelegram(message) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      text: `\`\`\`\n${message}\n\`\`\``,
      parse_mode: "MarkdownV2",
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Telegram API error: ${err}`);
  }
}

async function main() {
  try {
    const prices = await fetchPrices();
    const message = buildMessage(prices);
    console.log("\n" + message + "\n");
    await sendTelegram(message);
    console.log("Telegram notification sent.");
  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  }
}

main();
