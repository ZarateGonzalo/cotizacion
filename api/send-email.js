const { Resend } = require("resend");
const multer = require("multer");

console.log("🟢 SERVERLESS FUNCTION: /api/send-email loaded.");

// Initialize Resend
const resend = new Resend("re_YJKnZAuD_5nD42p8eEfW1qwuLXZhFM9pN");

// --- INICIO: FIX PARA CORS ---
// Define las cabeceras CORS para que el navegador permita la respuesta
const corsHeaders = {
  "Access-Control-Allow-Origin":
    "https://cotizacion-front-1c4gk4o8d-zarategonzalos-projects.vercel.app",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};
// --- FIN: FIX PARA CORS ---

// Configure Multer to store files in memory
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

// Export the handler function (Vercel requirement)
module.exports = async function handler(req, res) {
  console.log("🚀 REQUEST RECEIVED!");
  console.log("   - Method:", req.method);

  // --- INICIO: FIX PARA CORS (Manejo de la petición preflight OPTIONS) ---
  // El navegador envía una petición OPTIONS antes de la real para verificar permisos
  if (req.method === "OPTIONS") {
    console.log("ℹ️ Handling preflight OPTIONS request.");
    res.writeHead(200, corsHeaders).end();
    return;
  }
  // --- FIN: FIX PARA CORS ---

  // 1. Verify Method
  if (req.method !== "POST") {
    console.log(
      "❌ ERROR: Method not allowed. Expected POST, got:",
      req.method,
    );
    res
      .writeHead(405, corsHeaders)
      .end(JSON.stringify({ success: false, error: "Method Not Allowed" }));
    return;
  }

  console.log("✅ Method is POST. Proceeding...");

  // 2. Handle Multer Middleware
  const uploadMiddleware = upload.single("product_image");

  console.log("📤 Running Multer middleware to parse form data...");

  uploadMiddleware(req, res, async (err) => {
    if (err) {
      console.error("❌ MULTER ERROR:", err);
      res.writeHead(500, corsHeaders).end(
        JSON.stringify({
          success: false,
          error: "File upload failed",
          details: err.message,
        }),
      );
      return;
    }

    console.log("✅ Multer middleware finished successfully.");
    console.log("   - req.body keys:", Object.keys(req.body));
    console.log("   - req.file exists:", !!req.file);
    if (req.file) {
      console.log("   - File details:", {
        name: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
      });
    }

    try {
      // 3. Extract Data
      console.log("🔍 Extracting data from req.body...");
      const {
        company_name,
        contact_name,
        whatsapp,
        email,
        product_name,
        weight,
        amount,
        technical_details,
      } = req.body;

      console.log("✅ Extracted data:", {
        company_name,
        contact_name,
        email,
        product_name,
        amount,
      });

      // Validation
      if (!email || !product_name || !amount) {
        console.log("❌ VALIDATION ERROR: Missing required fields.");
        console.log("   - Email:", email);
        console.log("   - Product Name:", product_name);
        console.log("   - Amount:", amount);
        res.writeHead(400, corsHeaders).end(
          JSON.stringify({
            success: false,
            error: "Missing required fields",
          }),
        );
        return;
      }

      console.log("✅ Validation passed.");

      // Prepare Attachments
      let attachments = [];
      if (req.file) {
        console.log("🖼️ Preparing image attachment...");
        const base64Image = req.file.buffer.toString("base64");
        attachments.push({
          filename: req.file.originalname,
          content: base64Image,
          content_type: req.file.mimetype,
        });
        console.log("✅ Attachment prepared.");
      } else {
        console.log("ℹ️ No image file attached to this request.");
      }

      // Prepare Email Content
      console.log("📧 Preparing email content for Resend...");
      const emailData = {
        from: "onboarding@resend.dev",
        to: "zarategonzalofabian@gmail.com",
        subject: `Nueva Solicitud: ${product_name}`,
        html: `
          <h3>Nueva Solicitud de Cotización</h3>
          <p><strong>Empresa:</strong> ${company_name}</p>
          <p><strong>Contacto:</strong> ${contact_name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Producto:</strong> ${product_name}</p>
          <p><strong>Cantidad:</strong> ${amount} (${weight} kg)</p>
          ${technical_details ? `<p><strong>Detalles:</strong> ${technical_details}</p>` : ""}
        `,
        attachments,
      };
      console.log("✅ Email content prepared.");

      // 4. Send Email via Resend
      console.log("📬 Calling Resend API to send email...");
      const { data, error } = await resend.emails.send(emailData);

      if (error) {
        console.error("❌ RESEND API ERROR:", error);
        res
          .writeHead(500, corsHeaders)
          .end(JSON.stringify({ success: false, error: error.message }));
        return;
      }

      console.log("✅ Resend API call successful!");
      console.log("   - Resend Response Data:", data);

      // 5. Send Success Response
      console.log("🎉 SUCCESS: Sending final response to frontend.");
      res.writeHead(200, corsHeaders).end(
        JSON.stringify({
          // <-- ¡AQUÍ ESTÁ EL CAMBIO CLAVE!
          success: true,
          message: "Email sent successfully",
          data: data,
        }),
      );
    } catch (err) {
      console.error(
        "💥 CATCH BLOCK: A critical error occurred in the try block:",
        err,
      );
      res.writeHead(500, corsHeaders).end(
        JSON.stringify({
          success: false,
          error: "Server internal error",
          details: err.message,
        }),
      );
    }
  });
};
