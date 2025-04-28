// Theme Toggle Functionality
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
}

// Initialize theme
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
}

// Call initTheme when DOM loads
document.addEventListener('DOMContentLoaded', initTheme);

let QnA = []; // डेटा स्टोर करने के लिए खाली ऐरे
let currentLanguage = 'en'; // डिफॉल्ट भाषा

// 1. डेटा लोड करने का फंक्शन
async function loadData() {
    try {
        const response = await fetch('data.json');
        const data = await response.json();
        QnA = data.questions;
        console.log("डेटा लोड हो गया!");
    } catch (error) {
        console.error("डेटा लोड करने में समस्या:", error);
    }
}

// 2. पेज लोड होते ही डेटा लोड करें
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    setupModal();
});

// 3. मोडल सेटअप
function setupModal() {
    const modal = document.getElementById('file-modal');
    const closeBtn = document.querySelector('.close-btn');
    
    closeBtn.onclick = () => modal.style.display = "none";
    window.onclick = (event) => {
        if (event.target == modal) modal.style.display = "none";
    }
}

// 4. भाषा बदलने का फंक्शन
function switchLanguage() {
    currentLanguage = currentLanguage === 'en' ? 'hi' : 'en';
    updateLangButton();
}

// 5. भाषा बटन अपडेट करें
function updateLangButton() {
    const langBtn = document.getElementById('switch-lang');
    langBtn.textContent = currentLanguage === 'en' ? 'हिंदी' : 'English';
}

// 6. फजी मैचिंग फंक्शन (नया)
function fuzzyMatch(str1, str2) {
    // Remove repeated characters (reduce "placcement" to "placement")
    const cleanStr1 = str1.replace(/(.)\1+/g, '$1');
    const cleanStr2 = str2.replace(/(.)\1+/g, '$1');
    
    // Check for direct inclusion
    if (cleanStr1.includes(cleanStr2) || cleanStr2.includes(cleanStr1)) {
        return true;
    }
    
    // Check for common prefixes/suffixes
    const minLength = Math.min(cleanStr1.length, cleanStr2.length);
    const prefixMatch = cleanStr1.substring(0, minLength) === cleanStr2.substring(0, minLength);
    const suffixMatch = cleanStr1.slice(-minLength) === cleanStr2.slice(-minLength);
    
    if (prefixMatch || suffixMatch) {
        return true;
    }
    
    // Use Levenshtein distance as fallback
    const distance = levenshteinDistance(cleanStr1, cleanStr2);
    const maxLength = Math.max(cleanStr1.length, cleanStr2.length);
    
    return distance <= Math.max(2, maxLength * 0.3); // At least 2 characters or 30% difference
}

// 7. लेवेनश्टाइन डिस्टेंस फंक्शन (नया)
function levenshteinDistance(a, b) {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;
    
    // Swap to make 'a' the shorter string
    if (a.length > b.length) {
        [a, b] = [b, a];
    }
    
    const matrix = Array.from({ length: a.length + 1 }, (_, i) => [i]);
    matrix[0] = Array.from({ length: b.length + 1 }, (_, j) => j);
    
    for (let i = 1; i <= a.length; i++) {
        for (let j = 1; j <= b.length; j++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            matrix[i][j] = Math.min(
                matrix[i - 1][j] + 1,     // deletion
                matrix[i][j - 1] + 1,     // insertion
                matrix[i - 1][j - 1] + cost // substitution
            );
            
            // Damerau-Levenshtein transposition
            if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
                matrix[i][j] = Math.min(matrix[i][j], matrix[i - 2][j - 2] + cost);
            }
        }
    }
    
    return matrix[a.length][b.length];
}

// 8. जवाब ढूंढने का फंक्शन (अपडेटेड)
function findAnswer(userQuery) {
    const query = userQuery.toLowerCase().trim();
    
    // First try exact matching
    for (const question of QnA) {
        for (const keyword of question.keywords) {
            if (query.includes(keyword.toLowerCase())) {
                return processAnswer(question.answer[currentLanguage]);
            }
        }
    }
    let bestMatch = null;
    let bestScore = Infinity;
    
    for (const question of QnA) {
        for (const keyword of question.keywords) {
            const distance = levenshteinDistance(query, keyword.toLowerCase());
            const keywordLength = keyword.length;
            const score = distance / keywordLength; // Normalize by keyword length
            
            if (score < bestScore && score < 0.4) { // Threshold of 40% difference
                bestScore = score;
                bestMatch = question;
            }
        }
    }
    
    if (bestMatch) {
        return processAnswer(bestMatch.answer[currentLanguage]);
    }
    
    return currentLanguage === 'en' 
        ? "I didn't understand. Can you rephrase your question?" 
        : "मुझे समझ नहीं आया। क्या आप अपना प्रश्न दोबारा पूछ सकते हैं?";
}


// 9. जवाब प्रोसेसिंग
function processAnswer(answer) {
    // इमेज लिंक प्रोसेसिंग
    answer = answer.replace(/\[img:(.*?)\]/g, 
        '<img src="$1" class="chat-image" onclick="showImage(\'$1\')">');
    
    // PDF लिंक प्रोसेसिंग
    answer = answer.replace(/\[pdf:(.*?)\]/g, 
        '<a href="javascript:void(0)" onclick="showPDF(\'$1\')" class="file-link">PDF देखें</a>');
    
    // एक्सटर्नल लिंक प्रोसेसिंग
    answer = answer.replace(/\[link:(.*?)\|(.*?)\]/g, 
        '<a href="$1" target="_blank" rel="noopener" class="external-link">$2</a>');
    
    return answer;
}

// 10. फाइल व्यूअर फंक्शन्स
function showImage(imagePath) {
    const modal = document.getElementById('file-modal');
    const imgViewer = document.getElementById('image-viewer');
    const pdfViewer = document.getElementById('pdf-viewer');
    
    pdfViewer.style.display = 'none';
    imgViewer.src = imagePath;
    imgViewer.style.display = 'block';
    modal.style.display = 'block';
}

function showPDF(pdfPath) {
    const modal = document.getElementById('file-modal');
    const imgViewer = document.getElementById('image-viewer');
    const pdfViewer = document.getElementById('pdf-viewer');
    
    imgViewer.style.display = 'none';
    pdfViewer.src = pdfPath;
    pdfViewer.style.display = 'block';
    modal.style.display = 'block';
}

// 11. मैसेज भेजने का फंक्शन (अपडेटेड)
function sendMessage() {
    const userQuery = document.getElementById('user-query').value.trim();
    if (!userQuery) return;
    
    const chatDiv = document.getElementById('chat-display');
    
    // यूजर का मैसेज (बाईं ओर)
    chatDiv.innerHTML += `
        <div class="message user-message">
            <div class="message-sender">You</div>
            <div class="message-content">${userQuery}</div>
        </div>
    `;
    
    const answer = findAnswer(userQuery);
    
    // AI का जवाब (दाईं ओर)
    chatDiv.innerHTML += `
        <div class="message bot-message">
            <div class="message-sender">Bot</div>
            <div class="message-content">${answer}</div>
        </div>
    `;
    
    // इनपुट खाली करें
    document.getElementById('user-query').value = '';
    
    // ऑटो-स्क्रॉल
    chatDiv.scrollTop = chatDiv.scrollHeight;
}

// 12. इवेंट लिसनर्स
document.getElementById('send-btn').addEventListener('click', sendMessage);
document.getElementById('user-query').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});

// 13. इनिशियलाइज़ेशन
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    updateLangButton();
});

// 14. सुझाव के लिए प्रश्न भरें
function fillQuestion(question) {
    document.getElementById('user-query').value = question;
    document.getElementById('user-query').focus();
}