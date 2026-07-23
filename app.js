let questionsData = [];
let currentQuestionIndex = 0;
let questionCorrect = 0;
let questionIncorrect = 0;
let questionAmount = 0;
let isQuizActive = false;
let timerInterval = null;
let hasLeftTheScreen = false;
let startTime = null;
let liveCounter = null;

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
            
            const { data, error } = await client
                .from('userProfiles')
                .select('first_name, last_name')
                .eq('id', user.id)
                .single();
            
            if(error){
                console.error("Could not fetch user: ", error);
                return;
            }
            
            if(!data.first_name && !data.last_name){
                changeSection(userSetupSection);
            } else {
                changeSection(dashboardSection);
                fetchDashboardInformation();
            }
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

//Welcome message
const welcomeMessage = document.getElementById('welcomeMessage');

async function fetchName(){
    const { data: { user } } = await client.auth.getUser();

    const { data, error } = await client
        .from('userProfiles')
        .select('first_name')
        .eq('id', user.id)
        .single();
    if (error) {
        console.error("Could not fetch name: ", error);
        return;
    }

    //Handle messages for first time users
    const welcomeMessageOptions = data?.first_name ? `Welcome, ${data.first_name}!` : "Welcome!";
    welcomeMessage.textContent = welcomeMessageOptions;
}

fetchName();

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
const startPracticeReadingButton = document.getElementById('startPracticeReading');
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
            console.error("Error: ", error);
            return;
        }

        if(data){
            console.log("Profile updated!");
            changeSection(dashboardSection);
        } else {
            alert("Profile could not be updated!");
        }
});

startPracticeReadingButton.addEventListener('click', async () => {
    const { data: { user } } = await client.auth.getUser();

    const { data, error } = await client
        .from('userProfiles')
        .select('ReadingDiagnosticCompleted')
        .eq('id', user.id)
        .single();

    if(data.ReadingDiagnosticCompleted === false){
        try {
            const { data, error } = await client
                .from('diagnosticReadingQuestions')
                .select('*');
            questionsData = data;
        } catch (error) {
            console.error("Failed to fetch questions: ", error);
        }
    } else { //Adaptive Algorithm to be finished
        try {
            const { data, error } = await client
                .from('AllReadingQuestions')
                .select('*');
            questionsData = data;
        } catch (error) {
            console.error("Failed to fetch questions: ", error);
        }
    }

    isQuizActive = true;
    questionAmount = questionsData.length;
    changeSection(practiceSection);
    pullQuestion(questionAmount);

});

startPracticeMathButton.addEventListener('click', async () => {
    const { data: { user } } = await client.auth.getUser();

    const{ data, error } = await client
        .from('userProfiles')
        .select('MathDiagnosticCompleted')
        .eq('id', user.id)
        .single();

    if(data.MathDiagnosticCompleted === false){
        try {
            const { data, error } = await client
                .from('diagnosticMathQuestions')
                .select('*');
            questionsData = data;
        } catch (error) {
            console.error("Failed to fetch questions: ", error);
        }
    } else { //Adaptive Algorithm to be finished
        try {
            const { data, error } = await client
                .from('AllMathQuestions')
                .select('*')

            questionsData = data;
        } catch (error) {
            console.error("Failed to fetch questions: ", error);
        }
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

        startTime = performance.now();
        const timeCounter = document.getElementById('timeCounter');
        liveCounter = setInterval(() => {
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

        //Set diagnostics to complete

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
            <h3>${q.questionDomain}: ${q.questionSkill}</h3> 
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

    startTime = performance.now();

    const form = document.getElementById('quizForm');
    form.addEventListener('submit', async function (event) {
        event.preventDefault();
        const endTime = performance.now();
        const timeElapsedMs = endTime - startTime;
        const totalSeconds = Math.floor(timeElapsedMs / 1000);
        let isCorrectBoolean;

        if (liveCounter) {
            clearInterval(liveCounter);
            liveCounter = null;
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
        startTime = null;
        pullQuestion(questionAmount);
    });
}

// User reponse analysis

// async function fetchDashboardInformation(){
//     const { data: { user } } = await client.auth.getUser();

//     const { data , error } = await client
//         .from('userResponses')
//         .select('questionDomain, questionSkill, timeElapsed, isCorrect')
//         .eq('user_id', user.id);

//     if(error){
//         console.error("Error fetching user responses: ", error);
//         return;
//     }

//     console.log(data);

    //Determine how many question domains there are, and for each question domain find the correctness ratio and average time taken per question


// }


// async function adaptiveAlgorithm(){

// }