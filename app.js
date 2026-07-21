let currentQuestionIndex = 0;
let questionsData = [];
let questionCorrect = 0;
let questionIncorrect = 0;

//Supabase authentication and sign up
const SUPABASE_URL = "https://yksokqpgtusgdvnerfsc.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_Npi4T6_d7FZH8aWpl_wTsA_QZPChsQ0";

const { createClient } = supabase;
const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const modal = document.getElementById("authModal");
const modalTitle = document.getElementById("modalTitle");
const authSubmit = document.getElementById("authSubmit");
const authError = document.getElementById("authError");
let currentMode;

document.getElementById("login").addEventListener("click", () => {
    currentMode = "login";
    modalTitle.textContent = "Log In";
    authSubmit.textContent = "Log In";
    authError.textContent = "";
    modal.style.display = "flex";
});

document.getElementById("signup").addEventListener("click", () => {
    currentMode = "signup";
    modalTitle.textContent = "Sign Up";
    authSubmit.textContent = "Sign Up";
    authError.textContent = "";
    modal.style.display = "flex";
});

document.getElementById("closeModal").addEventListener("click", () => {
    modal.style.display = "none";
});

authSubmit.addEventListener("click", async () => {
    const email = document.getElementById("authEmail").value.trim();
    const password = document.getElementById("authPassword").value;
    authError.textContent = "";

    if (!email || !password) {
        authError.textContent = "Please enter your email and password.";
        return;
    }

    if (currentMode === "login") {
        const { error } = await client.auth.signInWithPassword({ email, password });
        if (error) {
            authError.textContent = error.message;
        } else {
            modal.style.display = "none";
            alert("Logged in successfully!");
        }
    } else {
        const { error } = await client.auth.signUp({ email, password });
        if (error) {
            authError.textContent = error.message;
        } else {
            modal.style.display = "none";
            alert("Account created! Check your email to confirm your account.");
        }
    }
});

//Section DOM
const welcomeSection = document.getElementById('welcomeSection');
const authenticationSection = document.getElementById('authenticationSection');
const dashboardSection = document.getElementById('dashboardSection');
const practiceSection = document.getElementById('practiceSection')

//Button DOM
const enterPortalButton = document.getElementById('enterPortalButton');
// const loginButton = document.getElementById('login');
const logoutButton = document.getElementById('logout');
const startPracticeEnglishButton = document.getElementById('startPracticeEnglish');

function changeSection(nextSection){
    welcomeSection.classList.add('hidden');
    authenticationSection.classList.add('hidden');
    dashboardSection.classList.add('hidden');
    practiceSection.classList.add('hidden');

    nextSection.classList.remove('hidden');
}

enterPortalButton.addEventListener('click', () => {
    changeSection(authenticationSection);
}); 

// logoutButton.addEventListener('click', () => {
//     changeSection(welcomeSection);
// });

startPracticeEnglishButton.addEventListener('click', async () => {
    try {
        const response = await fetch('questionTesting.json');
        questionsData = await response.json();

        changeSection(practiceSection);
        pullQuestion();
    } catch (error) {
        console.error("Failed to fetch questions:", error);
    }
});

function pullQuestion() {
    const container = document.getElementById('practiceSection');
    
    if (currentQuestionIndex >= questionsData.length) {
        container.innerHTML = `
            <div class="question-box">
                <h3>Practice Complete!</h3>
                <h2>Questions Correct: ${questionCorrect}</h2>
                <h2>Questions Incorrect: ${questionIncorrect}</h2>
                <button onclick="location.reload()">Back</button>
            </div>
        `;
        return;
    }

    const q = questionsData[currentQuestionIndex];

    container.innerHTML = `
        <div class="question-box">
            <h3>${q.questionID}</h3> 
            <form id="quizForm">
                <label>
                    <input type="radio" name="answer" value="Incorrect"> Incorrect
                </label><br>
                <label>
                    <input type="radio" name="answer" value="Correct"> Correct
                </label><br>
                <button type="submit">Submit</button>
            </form>
        </div>
    `;

    const form = document.getElementById('quizForm');
    form.addEventListener('submit', function(event) {
        event.preventDefault();

        const formData = new FormData(form);

        const userChoice = formData.get('answer');

        if(userChoice == "Incorrect"){
            questionIncorrect++;   
            currentQuestionIndex++;
            pullQuestion(); 
        } else if(userChoice == "Correct"){
            questionCorrect++;
            currentQuestionIndex++;
            pullQuestion(); 
        } else {
            alert("Choose an option.");
        }
    });
}