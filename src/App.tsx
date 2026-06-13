import React, { useState, useRef, useEffect } from "react";
import {
  Target,
  Image as ImageIcon,
  Download,
  RefreshCw,
  X,
  ChevronLeft,
  ChevronRight,
  Palette,
  Layers,
  Camera,
  FileArchive,
  CheckCircle2,
  Square,
  Settings,
  Save,
  AlertCircle,
  TrendingUp,
  BarChart,
  Upload,
} from "lucide-react";

export default function App() {
  const apiKey = ""; // Injetado automaticamente pelo Canvas

  // ==========================================
  // CONFIGURAÇÕES BASE WERT
  // ==========================================
  const WERT_DARK = "#121212";
  const WERT_RED = "#D30000";
  const WERT_WHITE = "#FFFFFF";
  const DEFAULT_LOGO = "https://wert.digital/assets/logo-wert.png";

  // ==========================================
  // ESTADOS GLOBAIS
  // ==========================================
  const [theme, setTheme] = useState("");
  const [handle, setHandle] = useState("@owanderfernandes");
  const [logoUrl, setLogoUrl] = useState(DEFAULT_LOGO);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [loaderMsg, setLoaderMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const [slides, setSlides] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const [caption, setCaption] = useState("");
  const [generatingCaption, setGeneratingCaption] = useState(false);

  const [userApiKey, setUserApiKey] = useState("");
  const [imageProvider, setImageProvider] = useState("unsplash_curated");

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const [wertProfile, setWertProfile] = useState({
    companyName: "WERT Performance",
    niche: "Engenharia de Vendas",
    city: "Atuação Nacional",
    targetAudience: "Donos de negócios",
    tone: "Profissional, Direto e Autoritário",
  });

  const targetOptions = [
    "Donos de negócios (Organização e Lucro)",
    "Líderes de vendas (Rotina e Metas)",
    "Vendas de alto valor (Fechamento e Segurança)",
    "Consultores e Executivos",
  ];

  // ==========================================
  // INICIALIZAÇÃO E PERSISTÊNCIA
  // ==========================================
  const safeStorageGet = (key: string) => {
    try {
      return window.localStorage.getItem(key);
    } catch (e) {
      return null;
    }
  };

  const safeStorageSet = (key: string, value: string) => {
    try {
      window.localStorage.setItem(key, value);
    } catch (e) {}
  };

  useEffect(() => {
    const loadScript = (src: string) => {
      if (!document.querySelector(`script[src="${src}"]`)) {
        const script = document.createElement("script");
        script.src = src;
        script.async = true;
        document.body.appendChild(script);
      }
    };
    loadScript(
      "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js",
    );
    loadScript(
      "https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.5/FileSaver.min.js",
    );

    const savedProfile = safeStorageGet("wertProfile");
    const savedTheme = safeStorageGet("wertTheme");
    const savedHandle = safeStorageGet("wertHandle");
    const savedLogo = safeStorageGet("wertLogoUrl");
    const savedApiKey = safeStorageGet("wertApiKey");
    const savedImageProvider = safeStorageGet("wertImageProvider");

    if (savedProfile) {
      setWertProfile(JSON.parse(savedProfile));
      setOnboardingComplete(true);
    }
    if (savedTheme) setIsDarkMode(savedTheme === "dark");
    if (savedHandle) setHandle(savedHandle);
    if (savedLogo) setLogoUrl(savedLogo);
    if (savedApiKey) setUserApiKey(savedApiKey);
    if (savedImageProvider) setImageProvider(savedImageProvider);

    setIsReady(true);
  }, []);

  const handleSaveProfile = () => {
    if (!wertProfile.companyName) {
      showError("Ei! Pelo menos o nome da empresa precisa estar preenchido.");
      return;
    }

    if (userApiKey) {
      const cleanedKey = userApiKey.trim();
      if (!cleanedKey.startsWith("AIza") && !cleanedKey.startsWith("AQ.")) {
        showError(
          "Chave inválida! As chaves do Google começam com 'AIza' ou 'AQ.'. Verifique o código copiado do AI Studio.",
        );
        return;
      }
      safeStorageSet("wertApiKey", cleanedKey);
      setUserApiKey(cleanedKey);
    }

    safeStorageSet("wertProfile", JSON.stringify(wertProfile));
    safeStorageSet("wertHandle", handle);
    safeStorageSet("wertImageProvider", imageProvider);
    if (logoUrl) safeStorageSet("wertLogoUrl", logoUrl);

    setOnboardingComplete(true);
    setShowSettings(false);
  };

  const showError = (msg: string) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(""), 6000);
  };

  const handleLogoUpload = (e: any) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setLogoUrl(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const getLuminance = (hex: string) => {
    if (!hex) return 0;
    let h = hex.replace("#", "");
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    const r = parseInt(h.slice(0, 2), 16) / 255;
    const g = parseInt(h.slice(2, 4), 16) / 255;
    const b = parseInt(h.slice(4, 6), 16) / 255;
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };

  // ==========================================
  // MOTOR DE IA COM FALLBACK (MICROSSERVIÇO BACKEND)
  // ==========================================
  const generateContentWithFallback = async (
    payload: any,
    activeKey: string,
    isImage = false,
  ) => {
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payload, activeKey, isImage }),
    });

    if (res.ok) {
      return await res.json();
    } else {
      const err = await res.json();
      throw new Error(
        err?.error?.message || "Erro no microsserviço de geração.",
      );
    }
  };

  // ==========================================
  // GERAR LEGENDA (IA)
  // ==========================================
  const generateCaption = async () => {
    if (slides.length === 0) return;
    setGeneratingCaption(true);

    const systemInstruction = `Você é Wander Fernandes, especialista em engenharia de vendas da WERT Performance. Crie uma legenda magnética e direta para o Instagram baseada neste carrossel.
    
CONTEXTO:
Empresa: ${wertProfile.companyName} (${wertProfile.niche}) com ${wertProfile.city}
Público Alvo: ${wertProfile.targetAudience}
Tom de Voz: ${wertProfile.tone}

REGRAS DA LEGENDA:
1. Gancho inicial que desperte atenção do líder ou dono do negócio.
2. Explique brevemente o valor da engenharia de vendas, previsibilidade e organização.
3. Call to Action (CTA) convidando para conhecer a WERT ou enviar uma mensagem.
4. Mantenha o texto limpo, sem jargões muito complexos, mas focado em resultados reais.
5. Exatamente 5 hashtags estratégicas para o nicho de vendas e negócios.`;

    const carouselText = slides
      .map((s: any, i) => `Slide ${i + 1}: ${s.title} - ${s.body}`)
      .join("\n");

    const payload = {
      contents: [
        {
          parts: [
            {
              text: `Tema geral: ${theme}\nConteúdo do Carrossel:\n${carouselText}\n\nEscreva a legenda e as hashtags.`,
            },
          ],
        },
      ],
      systemInstruction: { parts: [{ text: systemInstruction }] },
    };

    try {
      const activeKey = userApiKey ? userApiKey.trim() : apiKey;
      const data = await generateContentWithFallback(payload, activeKey, false);

      let text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) setCaption(text.trim());
      else showError("Não foi possível gerar a legenda.");
    } catch (err: any) {
      showError(`Ops: ${err.message}`);
    } finally {
      setGeneratingCaption(false);
    }
  };

  // ==========================================
  // GERAR CARROSSEL (IA)
  // ==========================================
  const generateCarousel = async () => {
    if (!theme) {
      showError("Coloque um tema para começarmos.");
      return;
    }

    setLoading(true);
    setLoaderMsg("Estruturando a engenharia de vendas...");

    const systemInstruction = `Você é um Especialista em Engenharia de Vendas e Diretor de Comunicação da WERT Performance. 

CONTEXTO DA EMPRESA:
Nome: ${wertProfile.companyName} (${wertProfile.niche})
Local: ${wertProfile.city}
Foco da Campanha: ${wertProfile.targetAudience}
Tom: ${wertProfile.tone}

Gere 7 slides para um Carrossel de Instagram:
1. Capa (Gancho forte sobre dores de vendas ou gestão).
2. O Contexto (O problema da desorganização ou de depender da sorte).
3. A Solução Estratégica (Slide de destaque visual).
4. Valores/Benefícios (Array 'details' com 3 pilares da engenharia de vendas).
5. Aprofundamento (Por que o método traz previsibilidade e lucro).
6. Como Aplicar (Array 'details' com 3 passos práticos).
7. CTA final (Chamada forte para conversão ou contato).

IMPORTANTE: 
O campo "imagePrompt" DEVE SER ESCRITO 100% EM PORTUGUÊS DO BRASIL (PT-BR). 
REGRAS OBRIGATÓRIAS NO PROMPT DE IMAGEM:
Sempre que sugerir pessoas na imagem, inclua o texto: "ambiente corporativo moderno de alto padrão, pessoas com roupas profissionais em tons neutros escuros, com detalhes sutis na cor vermelho vivo, iluminação de estúdio elegante, fotografia corporativa hiper realista".
A estética deve ser impecável, transmitindo sucesso, organização e alta performance em vendas.

Retorne APENAS um JSON puro no formato:
{ "slides": [ { "type": "...", "bgType": "LIGHT ou DARK", "tag": "...", "title": "...", "body": "...", "details": [], "imagePrompt": "..." } ] }`;

    const payload = {
      contents: [
        {
          parts: [
            {
              text: `Tema do Carrossel: ${theme}. Crie os 7 slides voltados para nosso público.`,
            },
          ],
        },
      ],
      systemInstruction: { parts: [{ text: systemInstruction }] },
      generationConfig: { responseMimeType: "application/json" },
    };

    try {
      const activeKey = userApiKey ? userApiKey.trim() : apiKey;
      const data = await generateContentWithFallback(payload, activeKey, false);

      let jsonText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      jsonText = jsonText
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();
      const parsed = JSON.parse(jsonText);

      if (parsed.slides && parsed.slides.length > 0) {
        const processedSlides = parsed.slides.map((s: any, i: number) => {
          let layout = "text";
          if (i === 0 || i === 4 || i === 6) layout = "full_image";
          else if (i === 2) layout = "card_image";

          const isLight = s.bgType === "LIGHT";
          return {
            ...s,
            layout,
            imageUrl: null,
            bgColor: isLight ? WERT_WHITE : WERT_DARK,
            textColor: isLight ? "#0f172a" : "#ffffff",
            accentColor: WERT_RED,
          };
        });

        setSlides(processedSlides as any);
        setCurrentIndex(0);
      }
    } catch (err: any) {
      showError("Erro na IA. Verifique sua conexão ou tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // GERAR IMAGEM (MULTIPLE PROVIDERS)
  // ==========================================
  const generateImageForSlide = async () => {
    const slide: any = slides[currentIndex];
    if (!slide || !slide.imagePrompt) return;

    setLoading(true);

    const curatedImages = [
      "https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=1080&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1556761175-4b46a572b786?q=80&w=1080&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?q=80&w=1080&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=1080&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=1080&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=1080&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?q=80&w=1080&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1497215728101-856f4ea42174?q=80&w=1080&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1606857521015-7f9fcf423740?q=80&w=1080&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1519389950473-47ba0277781c?q=80&w=1080&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1531973576160-7125cd663d86?q=80&w=1080&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1080&auto=format&fit=crop"
    ];

    try {
      const activeKey = userApiKey ? userApiKey.trim() : apiKey;
      const finalPrompt = slide.imagePrompt + ", hiper realista, alta qualidade, moderno, corporativo.";

      // 1. PROVIDER: UNSPLASH CURATED (No fails, premium static photos)
      if (imageProvider === "unsplash_curated") {
        setLoaderMsg("Buscando imagem premium no banco corporativo...");
        
        // Pick one randomly
        const randomImgUrl = curatedImages[Math.floor(Math.random() * curatedImages.length)];
        
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0);
          updateSlide("imageUrl", canvas.toDataURL("image/jpeg", 0.95));
          setLoading(false);
        };
        img.onerror = () => {
          showError("Falha na rede ao carregar imagem premium. Tente novamente.");
          setLoading(false);
        };
        img.src = randomImgUrl;
        return; // Ends execution here
      }

      // 2. PROVIDER: GOOGLE IMAGEN 3 (Requires paid API key)
      if (imageProvider === "imagen") {
        setLoaderMsg("Gerando fotografia via Google Imagen 3...");
        
        const payload = {
          instances: [{ prompt: finalPrompt }],
          parameters: { sampleCount: 1 },
        };

        const data = await generateContentWithFallback(payload, activeKey, true);
        const base64Data = data.predictions?.[0]?.bytesBase64Encoded;

        if (base64Data) {
          const mimeType = data.predictions?.[0]?.mimeType || "image/jpeg";
          const base64Url = `data:${mimeType};base64,${base64Data}`;
          updateSlide("imageUrl", base64Url);
        } else if (data.error) {
           showError(`Erro Imagen: ${data.error.message || "Verifique se o faturamento está ativo no AI Studio."}`);
        } else {
          showError("A IA não retornou a imagem. Tente novamente ou mude o provedor.");
        }
        setLoading(false);
        return;
      }

      // 3. PROVIDER: POLLINATIONS / FLUX (Grátis mas instável)
      if (imageProvider === "pollinations") {
        setLoaderMsg("Traduzindo e otimizando prompt para modelo alternativo (Flux)...");
        
        const textPayload = {
          contents: [
            { parts: [{ text: `Translate and optimize this prompt for a high-end AI Image Generator. Make it extremely realistic, modern, corporate, and cinematic. Return just the prompt in English. Original text: ${finalPrompt}` }] }
          ]
        };
        
        let enhancedPrompt = finalPrompt;
        try {
          const textData = await generateContentWithFallback(textPayload, activeKey, false);
          enhancedPrompt = textData.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || finalPrompt;
        } catch(e) { }

        setLoaderMsg("Renderizando imagem via IA Alternativa (Pollinations/Flux)...");
        const encodedPrompt = encodeURIComponent(enhancedPrompt);
        const seed = Math.floor(Math.random() * 100000000);
        const fallbackUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1080&height=1080&nologo=true&seed=${seed}`;
        
        const img = new Image();
        img.crossOrigin = "Anonymous";
        
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0);
          updateSlide("imageUrl", canvas.toDataURL("image/jpeg", 0.95));
          setLoading(false);
        };
        
        img.onerror = () => {
          // SE FALHAR, CAI PARA O CURATED (SEM MOSTRAR ERRO DESELEGANTE)
          console.warn("Pollinations falhou. Caimos pro Fallback Corporativo Curado (Silencioso).");
          const randomImgUrl = curatedImages[Math.floor(Math.random() * curatedImages.length)];
          const backupImg = new Image();
          backupImg.crossOrigin = "Anonymous";
          backupImg.onload = () => {
             const canvas = document.createElement("canvas");
             canvas.width = backupImg.width;
             canvas.height = backupImg.height;
             const ctx = canvas.getContext("2d");
             ctx?.drawImage(backupImg, 0, 0);
             updateSlide("imageUrl", canvas.toDataURL("image/jpeg", 0.95));
             setLoading(false);
          };
          backupImg.onerror = () => {
             showError("Os servidores de IA falharam e a rede bloqueou o download. Tente upload manual.");
             setLoading(false);
          }
          backupImg.src = randomImgUrl;
        };
        
        img.src = fallbackUrl;
        return;
      }

    } catch (err: any) {
      showError(`Ops: Erro inesperado ao processar imagem (${err.message}).`);
      setLoading(false);
    }
  };

  const handleSlideImageUpload = (e: any) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => updateSlide("imageUrl", reader.result);
      reader.readAsDataURL(file);
    }
  };

  const updateSlide = (field: string, value: any) => {
    const newSlides = [...slides];
    (newSlides[currentIndex] as any)[field] = value;
    setSlides(newSlides);
  };

  const updateDetail = (idx: number, value: any) => {
    const newSlides = [...slides];
    (newSlides[currentIndex] as any).details[idx] = value;
    setSlides(newSlides);
  };

  const activeSlide: any = slides[currentIndex];
  const isBgLight = activeSlide
    ? getLuminance(activeSlide.bgColor) > 0.4
    : false;

  // ==========================================
  // MOTOR DE RENDERIZAÇÃO (CANVAS)
  // ==========================================
  const loadImg = (src: string): Promise<HTMLImageElement | null> =>
    new Promise((r) => {
      if (!src) return r(null);
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.onload = () => r(img);
      img.onerror = () => r(null);
      img.src = src;
    });

  const getLines = (ctx: any, text: string, maxWidth: number) => {
    if (!text) return [];
    const words = text.split(" ");
    let lines = [];
    let currentLine = "";
    for (let i = 0; i < words.length; i++) {
      let testLine = currentLine + words[i] + " ";
      if (ctx.measureText(testLine).width > maxWidth && i > 0) {
        lines.push(currentLine.trim());
        currentLine = words[i] + " ";
      } else {
        currentLine = testLine;
      }
    }
    lines.push(currentLine.trim());
    return lines;
  };

  const roundRect = (
    ctx: any,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: any,
    fill: boolean,
    stroke: boolean,
  ) => {
    if (typeof radius === "number")
      radius = { tl: radius, tr: radius, br: radius, bl: radius };
    ctx.beginPath();
    ctx.moveTo(x + radius.tl, y);
    ctx.lineTo(x + width - radius.tr, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius.tr);
    ctx.lineTo(x + width, y + height - radius.br);
    ctx.quadraticCurveTo(
      x + width,
      y + height,
      x + width - radius.br,
      y + height,
    );
    ctx.lineTo(x + radius.bl, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius.bl);
    ctx.lineTo(x, y + radius.tl);
    ctx.quadraticCurveTo(x, y, x + radius.tl, y);
    ctx.closePath();
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
  };

  const drawSlideToCanvas = async (slide: any, index: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const bgColor = slide.bgColor || WERT_DARK;
    const isLight = getLuminance(bgColor) > 0.4;
    const isFullImage = slide.layout === "full_image";
    const accent = slide.accentColor || WERT_RED;
    const mainText = slide.textColor || (isLight ? "#0f172a" : "#ffffff");

    ctx.clearRect(0, 0, 1080, 1350);

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, 1080, 1350);

    if (isFullImage && slide.imageUrl) {
      const fullImg = await loadImg(slide.imageUrl);
      if (fullImg) {
        const imgHeight = 1050;
        const targetRatio = 1080 / imgHeight;
        const imgRatio = fullImg.width / fullImg.height;
        let sW, sH, sX, sY;
        if (imgRatio > targetRatio) {
          sH = fullImg.height;
          sW = fullImg.height * targetRatio;
          sX = (fullImg.width - sW) / 2;
          sY = 0;
        } else {
          sW = fullImg.width;
          sH = fullImg.width / targetRatio;
          sX = 0;
          sY = (fullImg.height - sH) / 2;
        }
        ctx.drawImage(fullImg, sX, sY, sW, sH, 0, 0, 1080, imgHeight);

        let darkGrad = ctx.createLinearGradient(0, 400, 0, 1350);
        darkGrad.addColorStop(0, "transparent");
        darkGrad.addColorStop(0.4, `rgba(${hexToRgb(bgColor)}, 0.8)`);
        darkGrad.addColorStop(0.7, bgColor);
        darkGrad.addColorStop(1, bgColor);
        ctx.fillStyle = darkGrad;
        ctx.fillRect(0, 0, 1080, 1350);
      }
    }

    if (!isFullImage && !isLight) {
      let glow = ctx.createRadialGradient(0, 0, 100, 0, 0, 900);
      const { r, g, b } = hexToRgb(accent, true) as any;
      glow.addColorStop(0, `rgba(${r},${g},${b},0.15)`);
      glow.addColorStop(1, "transparent");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, 1080, 1350);
    }

    if (!isFullImage) {
      const tag = (slide.tag || "PERFORMANCE").toUpperCase();
      ctx.font = `800 26px 'Inter', sans-serif`;
      const tagW = ctx.measureText(tag).width;

      ctx.fillStyle = isLight ? "rgba(255,255,255,0.9)" : "rgba(0,0,0,0.3)";
      ctx.strokeStyle = isLight ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)";
      ctx.lineWidth = 2;
      roundRect(ctx, 80, 80, tagW + 40, 56, 8, true, true);

      ctx.fillStyle = accent;
      roundRect(
        ctx,
        80,
        80,
        6,
        56,
        { tl: 8, bl: 8, tr: 0, br: 0 },
        true,
        false,
      );

      ctx.fillStyle = mainText;
      ctx.textAlign = "left";
      ctx.fillText(tag, 100, 118);

      ctx.font = `900 130px 'Inter', sans-serif`;
      const { r, g, b } = hexToRgb(accent, true) as any;
      ctx.fillStyle = `rgba(${r},${g},${b},0.15)`;
      ctx.textAlign = "right";
      ctx.fillText(`0${index + 1}`, 1000, 180);
    }

    const maxW = isFullImage ? 960 : 920;

    ctx.font = `800 85px 'Inter', sans-serif`;
    let titleLines = getLines(ctx, slide.title, maxW);

    ctx.font = `500 42px 'Inter', sans-serif`;
    let bodyLines = getLines(ctx, slide.body, maxW);

    const loadedLogo = await loadImg(logoUrl);
    let logoHeight = isFullImage && loadedLogo ? 160 : 0;
    let titleH = titleLines.length * 105;
    let bodyH = bodyLines.length * 62;
    let detailsH = 0;
    if (slide.details && slide.details.length > 0 && !isFullImage) {
      ctx.save();
      ctx.font = `600 22px 'Inter', sans-serif`;
      slide.details.forEach((det: string) => {
        const lines = getLines(ctx, det, 700);
        const cardH = Math.max(100, (lines.length * 34) + 40);
        detailsH += cardH + 20;
      });
      ctx.restore();
      detailsH += 10;
    }

    let predictedCardH = 0;
    let loadedCardImg = null;
    if (slide.layout === "card_image") {
      if (slide.imageUrl) {
        loadedCardImg = await loadImg(slide.imageUrl);
        if (loadedCardImg) {
          const ratio = loadedCardImg.width / loadedCardImg.height;
          predictedCardH = 920 / ratio;
          if (predictedCardH > 600) predictedCardH = 600;
        }
      } else {
        predictedCardH = 300;
      }
    }

    let baseContentHeight =
      logoHeight +
      titleH +
      50 +
      bodyH +
      detailsH +
      (slide.layout === "card_image" ? predictedCardH + 40 : 0);
    let safeAreaHeight = isFullImage ? 600 : 920;
    let startSafeY = isFullImage ? 550 : 200;
    let scale =
      baseContentHeight > safeAreaHeight
        ? safeAreaHeight / baseContentHeight
        : 1;

    ctx.save();
    if (scale < 1) {
      ctx.translate(540, 0);
      ctx.scale(scale, scale);
      ctx.translate(-540, 0);
    }

    let textY = startSafeY + (safeAreaHeight - baseContentHeight * scale) / 2;
    if (isFullImage) textY = 1150 / scale - baseContentHeight;

    const displayTextColor = isFullImage ? "#ffffff" : mainText;
    ctx.textAlign = isFullImage ? "center" : "left";

    if (isFullImage && loadedLogo) {
      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.3)";
      ctx.shadowBlur = 15;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(540, textY + 60, 60, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowColor = "transparent";

      const logoSize = 85;
      const logoRatio = loadedLogo.width / loadedLogo.height;
      let drawW = logoSize,
        drawH = logoSize;
      if (logoRatio > 1) drawH = logoSize / logoRatio;
      else drawW = logoSize * logoRatio;
      ctx.drawImage(
        loadedLogo,
        540 - drawW / 2,
        textY + 60 - drawH / 2,
        drawW,
        drawH,
      );
      ctx.restore();
      textY += 160;
    }

    ctx.font = `800 85px 'Inter', sans-serif`;
    titleLines.forEach((line, lineIdx) => {
      const currentY = textY + 85 + lineIdx * 105;
      const drawX = isFullImage ? 540 : 80;

      if (lineIdx === titleLines.length - 1 && line.split(" ").length >= 2) {
        const lineWords = line.split(" ");
        const normalText = lineWords.slice(0, -1).join(" ") + " ";
        const highlightText = lineWords.slice(-1).join(" ");

        if (isFullImage) {
          const totalW = ctx.measureText(line).width;
          const normalW = ctx.measureText(normalText).width;
          const startX = 540 - totalW / 2;
          ctx.textAlign = "left";
          ctx.fillStyle = displayTextColor;
          ctx.fillText(normalText, startX, currentY);
          ctx.fillStyle = accent;
          ctx.fillText(highlightText, startX + normalW, currentY);
          ctx.textAlign = "center";
        } else {
          ctx.fillStyle = displayTextColor;
          ctx.fillText(normalText, drawX, currentY);
          const normalW = ctx.measureText(normalText).width;
          ctx.fillStyle = accent;
          ctx.fillText(highlightText, drawX + normalW, currentY);
        }
      } else {
        ctx.fillStyle = displayTextColor;
        ctx.fillText(line, drawX, currentY);
      }
    });

    let contentY = textY + titleLines.length * 105 + 30;

    ctx.font = `500 42px 'Inter', sans-serif`;
    const { r: rT, g: gT, b: bT } = hexToRgb(displayTextColor, true) as any;
    ctx.fillStyle = isFullImage
      ? "rgba(255,255,255,0.9)"
      : `rgba(${rT},${gT},${bT},0.8)`;

    bodyLines.forEach((bLine) => {
      ctx.fillText(bLine, isFullImage ? 540 : 80, contentY + 42);
      contentY += 62;
    });
    contentY += 30;

    if (slide.details && slide.details.length > 0 && !isFullImage) {
      slide.details.forEach((det: any, i: number) => {
        ctx.save();
        ctx.font = `600 22px 'Inter', sans-serif`;
        const lines = getLines(ctx, det, 700); // 920 card width - 100 left padding - 60 right padding - safety margin
        const lineHeight = 32;
        const cardH = Math.max(100, (lines.length * lineHeight) + 40);

        ctx.fillStyle = isLight ? "rgba(255,255,255, 0.8)" : "rgba(0,0,0, 0.2)";
        ctx.strokeStyle = isLight
          ? "rgba(0,0,0, 0.05)"
          : "rgba(255,255,255,0.05)";
        ctx.lineWidth = 2;
        roundRect(ctx, 80, contentY, 920, cardH, 20, true, true);

        const numberTop = contentY + (cardH / 2) - 24;
        ctx.fillStyle = accent;
        roundRect(ctx, 100, numberTop, 48, 48, 12, true, false);

        ctx.fillStyle = isLight ? WERT_DARK : WERT_WHITE;
        ctx.font = `bold 28px 'Inter', sans-serif`;
        ctx.textAlign = "center";
        ctx.fillText((i + 1).toString(), 124, numberTop + 34);

        ctx.textAlign = "left";
        ctx.font = `600 22px 'Inter', sans-serif`;
        ctx.fillStyle = isLight ? WERT_DARK : "#ffffff";
        
        const textStartY = contentY + (cardH / 2) - ((lines.length * lineHeight) / 2) + 24;
        lines.forEach((line: string, lineIndex: number) => {
          ctx.fillText(line, 180, textStartY + (lineIndex * lineHeight));
        });
        
        ctx.restore();
        contentY += cardH + 20;
      });
    }

    if (slide.layout === "card_image") {
      const cardY = contentY;
      const drawH = predictedCardH;
      const drawW = loadedCardImg
        ? drawH * (loadedCardImg.width / loadedCardImg.height)
        : 920;
      const drawX = 540 - drawW / 2;

      ctx.save();
      ctx.fillStyle = isLight ? "rgba(0,0,0,0.03)" : "rgba(0,0,0,0.4)";
      ctx.strokeStyle = isLight ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.05)";
      ctx.lineWidth = 2;
      roundRect(ctx, drawX, cardY, drawW, drawH, 24, true, true);
      ctx.clip();

      if (loadedCardImg) {
        ctx.drawImage(loadedCardImg, drawX, cardY, drawW, drawH);
      } else {
        ctx.fillStyle = isLight ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.2)";
        ctx.font = "800 32px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("ESPAÇO DA FOTO", 540, cardY + drawH / 2);
      }
      ctx.restore();

      ctx.strokeStyle = isLight ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)";
      ctx.lineWidth = 2;
      roundRect(ctx, drawX, cardY, drawW, drawH, 24, false, true);
    }
    ctx.restore();

    ctx.fillStyle =
      isFullImage || !isLight
        ? "rgba(0, 0, 0, 0.5)"
        : "rgba(255, 255, 255, 0.9)";
    ctx.strokeStyle =
      isFullImage || !isLight
        ? "rgba(255, 255, 255, 0.1)"
        : "rgba(0, 0, 0, 0.05)";
    ctx.lineWidth = 1;
    roundRect(ctx, 80, 1180, 480, 80, 40, true, true);

    const footerTextColor = isFullImage || !isLight ? "#ffffff" : WERT_DARK;

    if (loadedLogo) {
      const logoSize = 60;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(125, 1220, 30, 0, Math.PI * 2);
      ctx.fill();

      const logoRatio = loadedLogo.width / loadedLogo.height;
      let drawW = logoSize,
        drawH = logoSize;
      if (logoRatio > 1) drawH = logoSize / logoRatio;
      else drawW = logoSize * logoRatio;
      ctx.drawImage(
        loadedLogo,
        125 - drawW / 2,
        1220 - drawH / 2,
        drawW,
        drawH,
      );
    } else {
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.arc(125, 1220, 20, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.textAlign = "left";
    ctx.fillStyle = footerTextColor;
    ctx.font = `bold 26px 'Inter', sans-serif`;
    ctx.fillText(handle, 175, 1230);

    ctx.fillStyle =
      isFullImage || !isLight
        ? "rgba(0, 0, 0, 0.5)"
        : "rgba(255, 255, 255, 0.9)";
    roundRect(ctx, 720, 1180, 280, 80, 40, true, true);
    ctx.textAlign = "center";
    ctx.fillStyle = accent;
    ctx.font = `bold 22px 'Inter', sans-serif`;
    ctx.fillText(index === 6 ? "SALVAR POST" : "DESLIZE >", 860, 1230);

    return canvas.toDataURL("image/png");
  };

  const hexToRgb = (hex: string, returnObj = false) => {
    let h = hex.replace("#", "");
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    const r = parseInt(h.slice(0, 2), 16) || 255;
    const g = parseInt(h.slice(2, 4), 16) || 255;
    const b = parseInt(h.slice(4, 6), 16) || 255;
    return returnObj ? { r, g, b } : `${r},${g},${b}`;
  };

  // ==========================================
  // EXPORTAÇÃO
  // ==========================================
  const exportSingle = async () => {
    if (!activeSlide) return;
    setExporting(true);
    try {
      const dataUrl = await drawSlideToCanvas(activeSlide, currentIndex);
      if (!dataUrl) return;
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `Slide_${currentIndex + 1}_WERT.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {
      showError("Erro ao baixar o slide.");
    } finally {
      setExporting(false);
    }
  };

  const exportZip = async () => {
    if (slides.length === 0) return;
    setExporting(true);
    try {
      if (!(window as any).JSZip || !(window as any).saveAs)
        throw new Error(
          "Bibliotecas carregando. Tente novamente em 2 segundos.",
        );
      const zip = new (window as any).JSZip();

      for (let i = 0; i < slides.length; i++) {
        const url = await drawSlideToCanvas(slides[i], i);
        if (!url) continue;
        const base64Data = url.split(",")[1];
        zip.file(`Slide_${i + 1}_WERT.png`, base64Data, { base64: true });
      }

      const content = await zip.generateAsync({ type: "blob" });
      (window as any).saveAs(content, "Carrossel_Conwert.zip");
    } catch (e: any) {
      showError(e.message || "Erro no ZIP.");
    } finally {
      setExporting(false);
    }
  };

  // ==========================================
  // ESTILIZAÇÃO E TEMAS
  // ==========================================
  if (!isReady) return <div className="min-h-screen bg-[#0A0A0A]"></div>;

  const t = {
    bg: isDarkMode ? "bg-[#0A0A0A]" : "bg-slate-50",
    textPrimary: isDarkMode ? "text-slate-100" : "text-slate-800",
    card: isDarkMode ? "bg-[#141414]" : "bg-white",
    border: isDarkMode ? "border-[#2A2A2A]" : "border-slate-200",
    input: isDarkMode ? "bg-[#000000]" : "bg-slate-50",
    inputText: isDarkMode ? "text-white" : "text-slate-900",
    mutedText: isDarkMode ? "text-gray-400" : "text-slate-500",
    accent: "text-[#D30000]",
    tagBg: isDarkMode ? "bg-[#2A2A2A]" : "bg-slate-100",
  };

  // ==========================================
  // FORMULÁRIO DE SETUP
  // ==========================================
  const renderSettingsForm = () => (
    <div className="space-y-4 text-left">
      <div className="flex gap-4 items-end">
        <div className="w-24">
          <label
            className={`text-[11px] font-bold ${t.mutedText} uppercase tracking-widest block mb-2`}
          >
            Brasão/Logo
          </label>
          <div
            className={`relative w-full aspect-square ${t.input} border ${t.border} rounded-xl flex items-center justify-center hover:border-[#D30000] transition-colors cursor-pointer overflow-hidden group`}
          >
            <input
              type="file"
              accept="image/*"
              className="absolute inset-0 opacity-0 cursor-pointer z-10"
              onChange={handleLogoUpload}
            />
            {logoUrl ? (
              <img
                src={logoUrl}
                className="w-full h-full object-contain p-1 bg-white"
                alt="Logo"
              />
            ) : (
              <span
                className={`text-xs font-bold ${t.mutedText} group-hover:text-[#D30000] text-center px-2`}
              >
                Subir Logo
              </span>
            )}
          </div>
        </div>
        <div className="flex-1 space-y-3">
          <div>
            <label
              className={`text-[11px] font-bold ${t.mutedText} uppercase tracking-widest block mb-1`}
            >
              Empresa
            </label>
            <input
              type="text"
              value={wertProfile.companyName}
              onChange={(e) =>
                setWertProfile({ ...wertProfile, companyName: e.target.value })
              }
              placeholder="Ex: WERT Performance"
              className={`w-full ${t.input} border ${t.border} rounded-xl px-4 py-2.5 text-sm ${t.inputText} outline-none focus:border-[#D30000] transition-colors`}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label
                className={`text-[11px] font-bold ${t.mutedText} uppercase tracking-widest block mb-1`}
              >
                Nicho/Método
              </label>
              <input
                type="text"
                value={wertProfile.niche}
                onChange={(e) =>
                  setWertProfile({ ...wertProfile, niche: e.target.value })
                }
                placeholder="Ex: Engenharia de Vendas"
                className={`w-full ${t.input} border ${t.border} rounded-xl px-4 py-2.5 text-sm ${t.inputText} outline-none focus:border-[#D30000] transition-colors`}
              />
            </div>
            <div>
              <label
                className={`text-[11px] font-bold ${t.mutedText} uppercase tracking-widest block mb-1`}
              >
                Abrangência
              </label>
              <input
                type="text"
                value={wertProfile.city}
                onChange={(e) =>
                  setWertProfile({ ...wertProfile, city: e.target.value })
                }
                placeholder="Ex: Atuação Nacional"
                className={`w-full ${t.input} border ${t.border} rounded-xl px-4 py-2.5 text-sm ${t.inputText} outline-none focus:border-[#D30000] transition-colors`}
              />
            </div>
          </div>
        </div>
      </div>

      <div>
        <label
          className={`text-[11px] font-bold ${t.mutedText} uppercase tracking-widest block mb-2 mt-2`}
        >
          Foco da Comunicação
        </label>
        <select
          value={wertProfile.targetAudience}
          onChange={(e) =>
            setWertProfile({ ...wertProfile, targetAudience: e.target.value })
          }
          className={`w-full ${t.input} border ${t.border} rounded-xl px-4 py-3 text-sm ${t.inputText} outline-none focus:border-[#D30000] transition-colors appearance-none cursor-pointer`}
        >
          {targetOptions.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          className={`text-[11px] font-bold ${t.mutedText} uppercase tracking-widest block mb-2`}
        >
          Instagram Oficial
        </label>
        <input
          type="text"
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          placeholder="@owanderfernandes"
          className={`w-full ${t.input} border ${t.border} rounded-xl px-4 py-3 text-sm ${t.inputText} outline-none focus:border-[#D30000] transition-colors`}
        />
      </div>

      <div className={`pt-4 mt-4 border-t ${t.border}`}>
        <label
          className={`text-[11px] font-bold ${t.mutedText} uppercase tracking-widest block mb-2`}
        >
          Sua Chave de IA (Google Gemini)
        </label>
        <p className={`text-xs ${t.mutedText} mb-3 leading-relaxed`}>
          Para a inteligência artificial gerar seus conteúdos, precisamos
          conectar o app ao Google. É de graça e muito rápido. Acesse o{" "}
          <a
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noreferrer"
            className="text-[#D30000] underline font-bold"
          >
            Google AI Studio
          </a>
          , faça login com sua conta, clique no botão azul "Create API Key" e
          cole o código aqui. Essa chave fica salva apenas no seu navegador.
        </p>
        <input
          type="text"
          value={userApiKey}
          onChange={(e) => setUserApiKey(e.target.value)}
          placeholder="Cole sua API Key aqui (ex: AIzaSy...)"
          className={`w-full ${t.input} border ${t.border} rounded-xl px-4 py-3 text-sm ${t.inputText} outline-none focus:border-[#D30000] transition-colors`}
        />
      </div>

      <div className={`pt-4 mt-4 border-t ${t.border}`}>
        <label
          className={`text-[11px] font-bold ${t.mutedText} uppercase tracking-widest block mb-2`}
        >
          Provedor de Imagem
        </label>
        <p className={`text-xs ${t.mutedText} mb-3 leading-relaxed`}>
          Escolha como quer gerar o fundo das postagens. Para consistência premium e estabilidade máxima, recomendamos o <b>Banco Corporativo Premium</b>.
        </p>
        <select
          value={imageProvider}
          onChange={(e) => setImageProvider(e.target.value)}
          className={`w-full ${t.input} border ${t.border} rounded-xl px-4 py-3 text-sm ${t.inputText} outline-none focus:border-[#D30000] transition-colors appearance-none cursor-pointer`}
        >
          <option value="unsplash_curated">Banco Corporativo Premium (Recomendado / Sem Erros)</option>
          <option value="pollinations">IA Alternativa Grátis (Pollinations / Instável)</option>
          <option value="imagen">Google Imagen 3 (Requer chave com faturamento ativado)</option>
        </select>
      </div>
    </div>
  );

  if (!onboardingComplete) {
    return (
      <div
        className={`min-h-screen ${t.bg} ${t.textPrimary} font-sans flex items-center justify-center p-4 py-12`}
      >
        {errorMsg && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded-lg shadow-xl font-bold text-sm flex items-center gap-2 z-50">
            <AlertCircle size={16} /> {errorMsg}
          </div>
        )}

        <div
          className={`max-w-xl w-full ${t.card} border ${t.border} p-8 rounded-2xl shadow-2xl space-y-6 text-center relative overflow-hidden`}
        >
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
            <Target size={150} />
          </div>

          <div className="relative z-10">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-[0_0_15px_rgba(211,0,0,0.3)] overflow-hidden">
              <img
                src={logoUrl}
                alt="Logo"
                className="w-full h-full object-contain p-1"
              />
            </div>
            <h1 className="text-2xl font-black mb-2">Bem-vindo à WERT!</h1>
            <p className={`${t.mutedText} text-sm mb-6 max-w-sm mx-auto`}>
              Configure os dados do especialista e empresa. A IA vai usar isso
              para criar posts magnéticos de engenharia de vendas.
            </p>

            {renderSettingsForm()}

            <button
              onClick={handleSaveProfile}
              className="w-full bg-[#D30000] hover:bg-[#A30000] text-white font-extrabold py-4 rounded-xl text-sm transition-all flex items-center justify-center gap-2 mt-6 shadow-lg"
            >
              <Save size={18} /> Salvar e Iniciar
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // INTERFACE PRINCIPAL
  // ==========================================
  return (
    <div
      className={`min-h-screen ${t.bg} ${t.textPrimary} font-sans p-4 pb-20 transition-colors duration-300 relative`}
    >
      <canvas ref={canvasRef} width="1080" height="1350" className="hidden" />

      {errorMsg && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded-lg shadow-xl font-bold text-sm flex items-center gap-2 z-50">
          <AlertCircle size={16} /> {errorMsg}
        </div>
      )}

      {showSettings && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 overflow-y-auto">
          <div
            className={`max-w-xl w-full ${t.card} border ${t.border} p-8 rounded-2xl shadow-2xl space-y-6 text-center relative overflow-hidden my-auto`}
          >
            <button
              onClick={() => setShowSettings(false)}
              className={`absolute top-4 right-4 ${t.mutedText} hover:${t.accent} z-50 p-2`}
            >
              <X size={24} />
            </button>

            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <Target size={150} />
            </div>

            <div className="relative z-10">
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-[0_0_15px_rgba(211,0,0,0.3)] overflow-hidden">
                <img
                  src={logoUrl}
                  alt="Logo"
                  className="w-full h-full object-contain p-1"
                />
              </div>
              <h1 className="text-2xl font-black mb-2">Ajustes da Conta</h1>
              <p className={`${t.mutedText} text-sm mb-6 max-w-sm mx-auto`}>
                Refine as configurações de comunicação para manter a
                assertividade do gerador.
              </p>

              {renderSettingsForm()}

              <button
                onClick={handleSaveProfile}
                className="w-full bg-[#D30000] hover:bg-[#A30000] text-white font-extrabold py-4 rounded-xl text-sm transition-all flex items-center justify-center gap-2 mt-6 shadow-lg"
              >
                <Save size={18} /> Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between py-2 relative z-[60]">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-lg overflow-hidden border border-[#D30000]/20">
              <img
                src={logoUrl}
                alt="Logo"
                className="w-full h-full object-contain p-0.5"
              />
            </div>
            <div>
              <h1 className="text-sm font-black tracking-wide leading-tight">
                Carrossel Conwert
              </h1>
              <p className={`text-[10px] ${t.mutedText} font-bold uppercase`}>
                {wertProfile.companyName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSettings(true)}
              className={`w-10 h-10 rounded-full ${t.card} border ${t.border} flex items-center justify-center hover:border-[#D30000] transition-colors cursor-pointer shadow-md`}
              title="Configurações"
              type="button"
            >
              <Settings size={18} className={t.mutedText} />
            </button>
          </div>
        </div>

        <div
          className={`${t.card} border ${t.border} p-5 rounded-2xl space-y-5 shadow-xl relative z-10`}
        >
          <div>
            <label
              className={`text-[11px] font-bold ${t.mutedText} uppercase tracking-widest block mb-2`}
            >
              Qual dor vamos resolver hoje?
            </label>
            <div className="relative">
              <input
                type="text"
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                placeholder="Ex: Como parar de depender da sorte para bater a meta..."
                className={`w-full ${t.input} border ${t.border} rounded-xl px-4 py-4 text-sm ${t.inputText} outline-none focus:border-[#D30000] transition-colors pr-10`}
              />
              {theme && (
                <button
                  onClick={() => setTheme("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-[#D30000]"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            <div className="mt-3">
              <span
                className={`text-[9px] font-bold ${t.mutedText} uppercase tracking-wider block mb-2`}
              >
                Ideias rápidas:
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() =>
                    setTheme(
                      "Como organizar a rotina do time comercial para não perder oportunidades",
                    )
                  }
                  className={`text-[10px] ${t.tagBg} hover:opacity-80 px-3 py-1.5 rounded-full border ${t.border}`}
                >
                  🎯 Líderes
                </button>
                <button
                  onClick={() =>
                    setTheme(
                      "O segredo para fechar vendas de alto valor com total segurança",
                    )
                  }
                  className={`text-[10px] ${t.tagBg} hover:opacity-80 px-3 py-1.5 rounded-full border ${t.border}`}
                >
                  💼 Alto Valor
                </button>
                <button
                  onClick={() =>
                    setTheme(
                      "Como o dono do negócio sai da bagunça e cria um processo previsível",
                    )
                  }
                  className={`text-[10px] ${t.tagBg} hover:opacity-80 px-3 py-1.5 rounded-full border ${t.border}`}
                >
                  📈 Empresários
                </button>
              </div>
            </div>
          </div>

          <button
            onClick={generateCarousel}
            disabled={loading || !theme}
            className={`w-full bg-[#D30000] hover:bg-[#A30000] text-white font-black py-4 rounded-xl text-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50`}
          >
            {loading && !slides.length ? (
              <RefreshCw size={16} className="animate-spin" />
            ) : (
              <TrendingUp size={16} />
            )}
            {loading && !slides.length
              ? "Processando estratégia..."
              : "Gerar Carrossel de Vendas"}
          </button>
        </div>

        {loading && (
          <div
            className={`${t.card} border ${t.border} p-6 rounded-2xl flex flex-col items-center justify-center text-center space-y-4`}
          >
            <Target size={30} className="animate-spin text-[#D30000]" />
            <div>
              <p className={`text-sm font-bold ${t.textPrimary} mb-1`}>
                {loaderMsg}
              </p>
              <p className={`text-[10px] ${t.mutedText}`}>
                Analisando os dados e montando a estrutura.
              </p>
            </div>
          </div>
        )}

        {slides.length > 0 && !loading && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
              <div className="flex items-center justify-between px-1 mb-3">
                <h3
                  className={`text-[10px] font-bold ${t.mutedText} uppercase tracking-widest`}
                >
                  Edição do Material
                </h3>
                <span className="text-[10px] font-bold text-[#D30000] bg-[#D30000]/10 px-3 py-1 rounded-md border border-[#D30000]/20">
                  {currentIndex + 1} / {slides.length}
                </span>
              </div>

              <div
                className={`w-full aspect-[4/5] bg-black rounded-3xl border ${t.border} shadow-2xl relative overflow-hidden flex flex-col max-w-sm mx-auto`}
              >
                <div
                  className="absolute inset-0 flex flex-col justify-between p-7 transition-colors duration-500"
                  style={{
                    backgroundColor: activeSlide?.bgColor,
                    color: activeSlide?.textColor,
                  }}
                >
                  {activeSlide?.layout === "full_image" &&
                    activeSlide?.imageUrl && (
                      <div className="absolute inset-0 z-0">
                        <img
                          src={activeSlide.imageUrl}
                          className="w-full h-[80%] object-cover"
                          alt=""
                        />
                        <div
                          className="absolute inset-0 bg-gradient-to-t"
                          style={{
                            backgroundImage: `linear-gradient(to top, ${activeSlide?.bgColor} 0%, transparent 60%)`,
                          }}
                        ></div>
                      </div>
                    )}

                  <div
                    className={`relative z-10 flex justify-between items-start ${activeSlide?.layout === "full_image" ? "opacity-0" : "opacity-100"} shrink-0 mb-4`}
                  >
                    <span
                      className="text-[9px] font-bold px-2 py-1 border rounded uppercase tracking-wider"
                      style={{
                        borderLeftColor: activeSlide?.accentColor,
                        borderLeftWidth: "3px",
                        background: isBgLight
                          ? "rgba(255,255,255,0.6)"
                          : "rgba(0,0,0,0.3)",
                        borderColor: isBgLight
                          ? "rgba(0,0,0,0.1)"
                          : "rgba(255,255,255,0.1)",
                      }}
                    >
                      {activeSlide?.tag}
                    </span>
                    <span
                      className="text-3xl font-black opacity-20"
                      style={{ color: activeSlide?.accentColor }}
                    >
                      0{currentIndex + 1}
                    </span>
                  </div>

                  <div
                    className={`relative z-10 flex-1 flex flex-col ${activeSlide?.layout === "full_image" ? "justify-end pb-2" : "justify-center"} px-2 overflow-hidden min-h-0`}
                  >
                    {activeSlide?.layout === "full_image" && logoUrl && (
                      <div className="w-16 h-16 rounded-full bg-white self-center mb-6 p-1 shrink-0 shadow-xl border border-white/20">
                        <img
                          src={logoUrl}
                          className="w-full h-full object-contain rounded-full"
                          alt=""
                        />
                      </div>
                    )}

                    <h2
                      className={`text-[24px] font-black leading-tight tracking-tight mb-3 shrink-0 ${activeSlide?.layout === "full_image" ? "text-center text-white" : ""}`}
                    >
                      {activeSlide?.title}
                    </h2>
                    <p
                      className={`text-[13px] opacity-90 leading-relaxed font-medium shrink-0 ${activeSlide?.layout === "full_image" ? "text-center text-white/90" : ""}`}
                    >
                      {activeSlide?.body}
                    </p>

                    {activeSlide?.layout === "card_image" && (
                      <div className="w-full flex-1 mt-4 rounded-xl flex items-center justify-center overflow-hidden shrink-0">
                        {activeSlide?.imageUrl ? (
                          <img
                            src={activeSlide?.imageUrl}
                            className="max-w-full max-h-[220px] object-cover rounded-xl"
                            alt=""
                          />
                        ) : (
                          <div className="w-full h-32 border border-white/10 bg-black/20 rounded-xl flex items-center justify-center">
                            <ImageIcon size={30} className="opacity-30" />
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div
                    className="relative z-10 border-t pt-4 flex justify-between items-center shrink-0 mt-4"
                    style={{
                      borderColor: isBgLight
                        ? "rgba(0,0,0,0.1)"
                        : "rgba(255,255,255,0.1)",
                    }}
                  >
                    <div
                      className="flex items-center gap-2 px-3 py-1.5 rounded-full border"
                      style={{
                        background: isBgLight
                          ? "rgba(255,255,255,0.5)"
                          : "rgba(0,0,0,0.3)",
                        borderColor: isBgLight
                          ? "rgba(0,0,0,0.1)"
                          : "rgba(255,255,255,0.1)",
                      }}
                    >
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: activeSlide?.accentColor }}
                      ></div>
                      <span className="text-[9px] font-bold">{handle}</span>
                    </div>
                    <div
                      className="text-[10px] font-bold uppercase"
                      style={{ color: activeSlide?.accentColor }}
                    >
                      {currentIndex === 6 ? "Salvar Post" : "Deslize >"}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setCurrentIndex((p) => Math.max(0, p - 1))}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/60 backdrop-blur rounded-full flex items-center justify-center text-white z-20 hover:bg-[#D30000] transition-colors"
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  onClick={() =>
                    setCurrentIndex((p) => Math.min(slides.length - 1, p + 1))
                  }
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/60 backdrop-blur rounded-full flex items-center justify-center text-white z-20 hover:bg-[#D30000] transition-colors"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>

            <div
              className={`${t.card} border ${t.border} p-5 rounded-2xl space-y-5 shadow-lg`}
            >
              <div
                className={`grid grid-cols-3 gap-2 ${t.input} p-3 rounded-xl border ${t.border}`}
              >
                <div>
                  <label
                    className={`text-[8px] font-bold ${t.mutedText} uppercase tracking-widest block mb-2`}
                  >
                    <Palette size={10} className="inline mr-1" /> Texto
                  </label>
                  <input
                    type="color"
                    value={activeSlide?.textColor || "#ffffff"}
                    onChange={(e) => updateSlide("textColor", e.target.value)}
                    className="w-6 h-6 rounded cursor-pointer border-none bg-transparent p-0"
                  />
                </div>
                <div>
                  <label
                    className={`text-[8px] font-bold ${t.mutedText} uppercase tracking-widest block mb-2`}
                  >
                    <Layers size={10} className="inline mr-1" /> Destaque
                  </label>
                  <input
                    type="color"
                    value={activeSlide?.accentColor || WERT_RED}
                    onChange={(e) => updateSlide("accentColor", e.target.value)}
                    className="w-6 h-6 rounded cursor-pointer border-none bg-transparent p-0"
                  />
                </div>
                <div>
                  <label
                    className={`text-[8px] font-bold ${t.mutedText} uppercase tracking-widest block mb-2`}
                  >
                    <Square size={10} className="inline mr-1" /> Fundo
                  </label>
                  <input
                    type="color"
                    value={activeSlide?.bgColor || WERT_DARK}
                    onChange={(e) => updateSlide("bgColor", e.target.value)}
                    className="w-6 h-6 rounded cursor-pointer border-none bg-transparent p-0"
                  />
                </div>
              </div>

              <div>
                <label
                  className={`text-[9px] font-bold ${t.mutedText} uppercase tracking-widest block mb-2`}
                >
                  Estrutura Visual
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => updateSlide("layout", "text")}
                    className={`py-2 text-[10px] font-bold border rounded-lg ${activeSlide?.layout === "text" ? "bg-[#D30000]/10 border-[#D30000] text-[#D30000]" : `${t.input} ${t.border} ${t.mutedText}`}`}
                  >
                    Somente Texto
                  </button>
                  <button
                    onClick={() => updateSlide("layout", "card_image")}
                    className={`py-2 text-[10px] font-bold border rounded-lg ${activeSlide?.layout === "card_image" ? "bg-[#D30000]/10 border-[#D30000] text-[#D30000]" : `${t.input} ${t.border} ${t.mutedText}`}`}
                  >
                    Foto Central
                  </button>
                  <button
                    onClick={() => updateSlide("layout", "full_image")}
                    className={`py-2 text-[10px] font-bold border rounded-lg ${activeSlide?.layout === "full_image" ? "bg-[#D30000]/10 border-[#D30000] text-[#D30000]" : `${t.input} ${t.border} ${t.mutedText}`}`}
                  >
                    Foto Fundo
                  </button>
                </div>
              </div>

              <div className={`${t.input} p-3 rounded-xl border ${t.border}`}>
                <label
                  className={`text-[9px] font-bold ${t.mutedText} uppercase tracking-widest block mb-2`}
                >
                  Criação de Imagem (IA ou Upload)
                </label>
                <textarea
                  value={activeSlide?.imagePrompt}
                  onChange={(e) => updateSlide("imagePrompt", e.target.value)}
                  placeholder="Detalhe a foto corporativa aqui para a IA..."
                  className={`w-full ${t.card} border ${t.border} rounded-lg px-3 py-2 text-[10px] ${t.inputText} outline-none focus:border-[#D30000] resize-none h-16 mb-2`}
                />
                <div className="flex gap-2">
                  <button
                    onClick={generateImageForSlide}
                    className="flex-1 bg-[#1A1A1A] hover:bg-[#2A2A2A] text-white border border-[#333] font-bold py-2.5 rounded-lg text-xs flex items-center justify-center gap-2 transition-colors"
                  >
                    <Camera size={14} /> Gerar com IA
                  </button>
                  <div className="relative flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleSlideImageUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      title="Subir foto local"
                    />
                    <div className="w-full h-full bg-[#D30000] hover:bg-[#A30000] text-white font-bold py-2.5 rounded-lg text-xs flex items-center justify-center gap-2 transition-colors">
                      <Upload size={14} /> Fazer Upload
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4
                  className={`text-[10px] font-bold ${t.mutedText} uppercase tracking-widest border-b ${t.border} pb-2 mb-3`}
                >
                  Conteúdo do Slide
                </h4>
                <div className="space-y-3">
                  <input
                    type="text"
                    value={activeSlide?.title || ""}
                    onChange={(e) => updateSlide("title", e.target.value)}
                    className={`w-full ${t.input} border ${t.border} rounded-lg px-3 py-2 text-xs ${t.inputText} font-bold outline-none`}
                  />
                  <textarea
                    value={activeSlide?.body || ""}
                    onChange={(e) => updateSlide("body", e.target.value)}
                    className={`w-full ${t.input} border ${t.border} rounded-lg px-3 py-2 text-xs ${t.inputText} outline-none resize-none h-20`}
                  />

                  {activeSlide?.details && activeSlide.details.length > 0 && (
                    <div className="space-y-2 pt-2">
                      {activeSlide.details.map((det: any, i: number) => (
                        <input
                          key={i}
                          type="text"
                          value={det}
                          onChange={(e) => updateDetail(i, e.target.value)}
                          className={`w-full ${t.input} border ${t.border} rounded-lg px-3 py-1.5 text-[10px] ${t.inputText} outline-none`}
                        />
                      ))}
                    </div>
                  )}

                  <div className={`pt-4 mt-4 border-t ${t.border}`}>
                    <div className="flex items-center justify-between mb-2">
                      <label
                        className={`text-[8px] font-bold ${t.mutedText} uppercase block`}
                      >
                        Legenda para Publicação
                      </label>
                      <button
                        onClick={generateCaption}
                        disabled={generatingCaption}
                        className={`text-[9px] bg-[#D30000] text-white font-bold px-2 py-1.5 rounded disabled:opacity-50 flex items-center gap-1`}
                      >
                        {generatingCaption ? (
                          <RefreshCw size={10} className="animate-spin" />
                        ) : (
                          <BarChart size={10} />
                        )}
                        Escrever com IA
                      </button>
                    </div>
                    <textarea
                      value={caption}
                      onChange={(e) => setCaption(e.target.value)}
                      placeholder="A legenda estratégica aparecerá aqui..."
                      className={`w-full ${t.input} border ${t.border} rounded-lg px-3 py-3 text-xs ${t.inputText} outline-none resize-none h-28`}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-4">
              <button
                onClick={exportSingle}
                disabled={exporting}
                className={`w-full ${t.card} border ${t.border} hover:border-[#D30000] text-[10px] font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-colors`}
              >
                <Download size={14} /> SALVAR ESTE CARD
              </button>
              <button
                onClick={exportZip}
                disabled={exporting}
                className="w-full bg-[#1A1A1A] text-white border border-[#333] hover:bg-[#D30000] hover:border-[#D30000] font-bold py-3.5 rounded-xl text-[10px] flex items-center justify-center gap-2 transition-colors"
              >
                <FileArchive size={14} /> BAIXAR CARROSSEL (.ZIP)
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
