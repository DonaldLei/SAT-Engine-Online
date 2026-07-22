let questionsData = [];
let currentQuestionIndex = 0;
let questionCorrect = 0;
let questionIncorrect = 0;
let questionAmount = 0;
let isQuizActive = false;
let timerInterval = null;
let hasLeftTheScreen = false;
let liveCounter = null;
let startTime = null;

//Supabase authentication and sign up
const SUPABASE_URL = "https://yksokqpgtusgdvnerfsc.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_Npi4T6_d7FZH8aWpl_wTsA_QZPChsQ0";

const client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
            const { data: { user } } = await client.auth.getUser();
            await checkDiagnostic(user);
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

//User set up prompt

//Check if the user has completed the diagnostic, to decide w
async function checkDiagnostic(user){
    const { data, error } = await client
        .from('userProfiles')
        .select('diagnosticCompleted')
        .eq('id', user.id)
        .single();
    if (error) {
        console.error("Could not fetch profile: ", error);
        return;
    }

    if(data.diagnosticCompleted == false){
        console.log("Diagnostics not completed.");
        changeSection(userSetupSection);
    } else {
        changeSection(dashboardSection);
    }
}

//Section DOM
const welcomeSection = document.getElementById('welcomeSection');
const authenticationSection = document.getElementById('authenticationSection');
const dashboardSection = document.getElementById('dashboardSection');
const practiceSection = document.getElementById('practiceSection');
const userSetupSection = document.getElementById('userSetupSection');
const diagnosticSection = document.getElementById('diagnosticSection');


//Button DOM
const enterPortalButton = document.getElementById('enterPortalButton');
const logoutButton = document.getElementById('logout');
const startPracticeEnglishButton = document.getElementById('startPracticeEnglish');
const startPracticeMathButton = document.getElementById('startPracticeMath');
const userProfileForm = document.getElementById('userProfileForm');
const startDiagnosticButton = document.getElementById('startDiagnostic');

function changeSection(nextSection){
    welcomeSection.classList.add('hidden');
    authenticationSection.classList.add('hidden');
    dashboardSection.classList.add('hidden');
    practiceSection.classList.add('hidden');
    userSetupSection.classList.add('hidden');
    diagnosticSection.classList.add('hidden');

    nextSection.classList.remove('hidden');
}

enterPortalButton.addEventListener('click', () => {
    changeSection(authenticationSection);
}); 

userProfileForm.addEventListener('submit', async (website) => {
    website.preventDefault();

    const firstName = document.getElementById('firstName').value;
    const lastName = document.getElementById('lastName').value;

    const { data: { user } } = await client.auth.getUser();

    const { data, error } = await client
        .from('userProfiles')
        .update({
            first_name: firstName,
            last_name: lastName
        })
        .eq('id', user.id)
        .select();

        if(error){
            console.log("Error: ", error);
            return;
        }

        if(data){
            console.log("Profile updated!");
            changeSection(diagnosticSection);
        } else {
            alert("Profile could not be updated!");
        }
});

startPracticeEnglishButton.addEventListener('click', async () => {
    try {
        const { data, error } = await client
            .from('AllReadingQuestions')
            .select('*');
            questionsData = data;

    } catch (error) {
        console.error("Failed to fetch questions: ", error);
    }

    isQuizActive = true;
    questionAmount = questionsData.length;
    changeSection(practiceSection);
    pullQuestion(questionAmount);

});

startPracticeMathButton.addEventListener('click', async () => {
    try {
        const { data, error } = await client
            .from('AllMathQuestions')
            .select('*');
            questionsData = data;
    } catch (error) {
        console.error("Failed to fetch questions: ", error);
    }

    isQuizActive = true;
    questionAmount = questionsData.length;
    changeSection(practiceSection);
    pullQuestion(questionAmount);
});

startDiagnosticButton.addEventListener('click', async () => {
    try {
        const { data, error } = await client
            .from('diagnosticReadingQuestions')
            .select('*');
            questionsData = data;
    } catch (error) {
        console.error("Failed to fetch questions: ", error);
    }
    isQuizActive = true;
    questionAmount = questionsData.length;
    changeSection(practiceSection);
    pullQuestion(questionAmount);
});

//Detects when user leaves the screen to start the timer
document.addEventListener("visibilitychange", () => {
    if(isQuizActive && document.visibilityState == 'hidden' && !hasLeftTheScreen){
        hasLeftTheScreen = true;
        const startTime = performance.now();
        const timeCounter = document.getElementById('timeCounter');
        let liveCounter = setInterval(() => {
            const currentTime = performance.now();
            const secondsPassed = Math.floor((currentTime - startTime) / 1000);

            timeCounter.textContent = `Time Taken: ${secondsPassed} seconds`;
        }, 1000);
    }
});

function pullQuestion(questionAmount) {
    const container = document.getElementById('practiceSection');

    if (currentQuestionIndex >= questionAmount) {
        isQuizActive = false;
        clearInterval(timerInterval);
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
            <div id = "timeCounter">Time Taken: 0 seconds</div>
            <p>Question: ${currentQuestionIndex + 1} / ${questionAmount}</p>
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

    const startTime = performance.now();

    const form = document.getElementById('quizForm');
    form.addEventListener('submit', async function (event) {
        event.preventDefault();
        const endTime = performance.now();
        const timeElapsedMs = endTime - startTime;
        const totalSeconds = Math.floor(timeElapsedMs / 1000);
        let isCorrectBoolean;

        if (liveCounter) {
            clearInterval(liveCounter);
        }

        const formData = new FormData(form);
        const userChoice = formData.get('answer');

        if (userChoice == "Incorrect") {
            isCorrectBoolean = false;
            questionIncorrect++;
        } else if (userChoice == "Correct") {
            isCorrectBoolean = true;
            questionCorrect++;
        } else {
            alert("Choose an option.");
            return;
        }

        const { data: { user } } = await client.auth.getUser();

        const { data, error } = await client
            .from('userResponses')
            .insert([{
                id: user.id,
                questionID: q.questionID,
                questionDomain: q.questionDomain,
                questionSkill: q.questionSkill,
                difficulty: q.questionDifficulty,
                timeElapsed: totalSeconds,
                isCorrect: isCorrectBoolean
            }]);

        if (error) {
            console.error("Issue with inserting: ", error);
        }
        currentQuestionIndex++;
        hasLeftTheScreen = false;
        pullQuestion(questionAmount);
    });
}
