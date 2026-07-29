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
let diagnosticSubject = '';

//Supabase authentication and sign up
const SUPABASE_URL = "https://yksokqpgtusgdvnerfsc.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_Npi4T6_d7FZH8aWpl_wTsA_QZPChsQ0";

const client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const modal = document.getElementById("authModal");
const modalTitle = document.getElementById("modalTitle");
const authSubmit = document.getElementById("authSubmit");
const authError = document.getElementById("authError");
let currentMode;

document.addEventListener('DOMContentLoaded', async () => {
    const loadingOverlay = document.getElementById('loadingOverlay');
    const { data: { session } } = await client.auth.getSession();

    if (session) {
        const { data: profile } = await client
            .from('userProfiles')
            .select('first_name, last_name')
            .eq('id', session.user.id)
            .single();

        if (!profile || !profile.first_name || !profile.last_name) {
            changeSection(userSetupSection);
        } else {
            const savedSectionId = localStorage.getItem('lastViewedSection');
            const targetSection = savedSectionId ? document.getElementById(savedSectionId) : null;

            if (targetSection && targetSection.id !== 'welcomeSection' && targetSection.id !== 'authenticationSection') {
                changeSection(targetSection);
                
                if (targetSection.id === 'dashboardSection') {
                    await renderDashboard();
                }
            } else {
                await renderDashboard();
            }
        }
    } else {
        changeSection(welcomeSection);
    }
    
    if(loadingOverlay) loadingOverlay.style.display = 'none';
});

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
                await renderDashboard();
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

async function fetchName(){
    const { data: { user } } = await client.auth.getUser();

    const { data, error } = await client
        .from('userProfiles')
        .select('first_name, last_name')
        .eq('id', user.id)
        .single();
    if (error) {
        console.error("Could not fetch name: ", error);
        changeSection(userSetupSection);
        return;
    }

    const welcomeMessage = document.getElementById('welcomeMessage');
    const welcomeMessageOptions = `Welcome, ${data.first_name}!`;
    welcomeMessage.textContent = welcomeMessageOptions;
}

//Section DOM
const welcomeSection = document.getElementById('welcomeSection');
const authenticationSection = document.getElementById('authenticationSection');
const dashboardSection = document.getElementById('dashboardSection');
const practiceSection = document.getElementById('practiceSection');
const userSetupSection = document.getElementById('userSetupSection');
const scheduleTestSection = document.getElementById('scheduleTestSection');
const diagnosticSection = document.getElementById('diagnosticSection');

//Button DOM
const enterPortalButton = document.getElementById('enterPortalButton');
const logoutButton = document.getElementById('logout');
const startPracticeReadingButton = document.getElementById('startPracticeReading');
const startPracticeMathButton = document.getElementById('startPracticeMath');
const userProfileForm = document.getElementById('userProfileForm');
const menuButtons = document.querySelectorAll('.menuButtons');
const scheduleTestDate = document.getElementById('scheduleTestDate');
const startDiagnostic = document.getElementById('startDiagnostic');

function changeSection(nextSection) {
    const sections = document.querySelectorAll('.viewApp');
    sections.forEach(s => s.classList.add('hidden'));
    
    nextSection.classList.remove('hidden');

    const sidebar = document.getElementById('appSidebar');
    
    const hideSidebarOn = ['welcomeSection', 'authenticationSection', 'userSetupSection'];

    if (hideSidebarOn.includes(nextSection.id)) {
        sidebar.classList.add('hidden'); 
    } else {
        sidebar.classList.remove('hidden');
    }
    
    localStorage.setItem('lastViewedSection', nextSection.id);
    console.log("Saved to storage:", localStorage.getItem('lastViewedSection'));
}

enterPortalButton.addEventListener('click', () => {
    changeSection(authenticationSection);
}); 

document.getElementById('backToWelcome').addEventListener('click', () => {
    modal.style.display = 'none';
    changeSection(welcomeSection);
    fetchDashboardInformation();
});

userProfileForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const formData = new FormData(event.target);

    const userProfileData = {
        first_name: formData.get('firstName'),
        last_name: formData.get('lastName'),
        currentGrade: formData.get('gradeLevel'),
        targetApplicationDeadline: formData.get('deadline'),
        satAttempts: formData.get('satAttempts'),
        currentScore: formData.get('currentScore')
    }
    
    const { data: { user } } = await client.auth.getUser();

    const { data, error } = await client
        .from('userProfiles')
        .update(userProfileData)
        .eq('id', user.id)
        .select();

        if(error){
            console.error("Error: ", error);
            return;
        }

        if(data){
            console.log("Profile updated!");
            changeSection(dashboardSection);
            fetchName();
        } else {
            alert("Profile could not be updated!");
        }
});

//Insert new scheduling into the database for tutors, can only send one request at a time, will only display one request
//Problem: Cannot reference a column that is not unique. Could only reference the id and then update the row later using the id. 
scheduleTestDate.addEventListener('submit', async (event) => {
    event.preventDefault();
    
    const formData = new FormData(event.target);

    const testDateScheduled = formData.get('testDate');

    const { data: { user } } = await client.auth.getUser();

    // const userName = await fetchName();

    // console.log(userName);

    const { data, error } = await client
        .from('studentRequests')
        .insert([{
            studentID: user.id,
            scheduleDate: testDateScheduled,
            // studentFirstName: userName.first_name,
            // studentLastName: userName.last_name
        }]);

    if (error) {
        console.error("Error: ", error);
        alert("You have already scheduled a date!");
        return;
    }

    if(data){
        alert("Scheduled test has been requested."); 
    } else {
        alert("Scheduled test has been requested.");
    }
});

async function renderDashboard() {
    changeSection(dashboardSection);
    await fetchName();

    const userStatistics = await fetchDashboardInformation();
    const quickInformationEnglish = document.getElementById('skillsListReading');
    const quickInformationMathematics = document.getElementById('skillsListMathematics');

    if (!quickInformationEnglish || !quickInformationMathematics) {
        console.warn("Dashboard containers not found. Skipping render.");
        return;
    }

    let temporaryTextHolder1 = '';
    const englishLimit = Math.min(3, userStatistics.English.length);
    for (let i = 0; i < englishLimit; i++) {
        const statistics = userStatistics.English[i];
        temporaryTextHolder1 += `
            <div class="skillsListReading">
                <ul>
                    <li><p>${statistics.domainName} | Accuracy: ${statistics.domainAccuracy}% | Avg: ${statistics.domainAverageTimeElapsed} seconds</p></li>
                </ul>
            </div>`;
    }
    quickInformationEnglish.innerHTML = temporaryTextHolder1;

    let temporaryTextHolder2 = '';
    const mathematicsLimit = Math.min(3, userStatistics.Mathematics.length);
    for (let i = 0; i < mathematicsLimit; i++) {
        const statistics = userStatistics.Mathematics[i];
        temporaryTextHolder2 += `
            <div class="skillsListMathematics">
                <ul>
                    <li><p>${statistics.domainName} | Accuracy: ${statistics.domainAccuracy}% | Avg: ${statistics.domainAverageTimeElapsed} seconds</p></li>
                </ul>
            </div>`;
    }
    quickInformationMathematics.innerHTML = temporaryTextHolder2;
}

async function fetchScheduleDateInformation(){
    const scheduledDateText = document.getElementById('scheduledDateText');
    const scheduledDateStatus = document.getElementById('scheduledDateStatus');
    const scheduledDateComment = document.getElementById('scheduledDateComment');

    const { data: { user } } = await client.auth.getUser();

    const { date, error } = await client
        .from('studentRequests')
        .select('studentID')
}

document.querySelector('.mainTabs').addEventListener('click', async (event) => {
    if (event.target.classList.contains('menuButton')) {
        const target = event.target.dataset.target;

        if (target === 'logout') {
            await client.auth.signOut();
            changeSection(welcomeSection);
            return;
        }

        const section = document.getElementById(target);
        if (section) {
            changeSection(section);
        } else {
            console.warn("Could not change section");
        }
    }
});

startDiagnostic.addEventListener('click', async () => {
    let diagnosticTableName;
    
    if(diagnosticSubject === "English"){
        diagnosticTableName = 'diagnosticReadingQuestions';
    } else {
        diagnosticTableName = 'diagnosticMathQuestions';
    }

    const { data, error } = await client
        .from(diagnosticTableName)
        .select('*');

    if (error) {
        console.error("Fetch failed:", error);
        return;
    }

    startQuiz(data);
});

function startQuiz(questions){
    if(!questions){
        return;
    }

    questionsData = questions;
    isQuizActive = true;
    questionAmount = questionsData.length;
    changeSection(practiceSection);
    pullQuestion(questionAmount);
}

startPracticeReadingButton.addEventListener('click', async () => {
    currentQuestionIndex = 0;
    questionCorrect = 0;
    questionIncorrect = 0;
    hasLeftTheScreen = false;

    const { data: { user } } = await client.auth.getUser();

    const { data, error } = await client
        .from('userProfiles')
        .select('ReadingDiagnosticCompleted')
        .eq('id', user.id)
        .single();

    if(data.ReadingDiagnosticCompleted === false){
        diagnosticSubject = "English";
        changeSection(diagnosticSection);
    } else { 
        try {
            const questionsData = await adaptiveAlgorithm('English');
            startQuiz(questionsData);
        } catch (error) {
            console.error("Failed to fetch questions: ", error);
        }
    }
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
            changeSection(diagnosticSection);
        } catch (error) {
            console.error("Failed to fetch questions: ", error);
        }
    } else {
        try {
            questionsData = await adaptiveAlgorithm('Mathematics');
            startQuiz(questionsData);
        } catch (error) {
            console.error("Failed to fetch questions: ", error);
        }
    }
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

async function pullQuestion(questionAmount) {
    const container = document.getElementById('practiceSection');

    if (currentQuestionIndex >= questionAmount) {
        isQuizActive = false;
        clearInterval(liveCounter);

        const { data: { user } } = await client.auth.getUser();

        const { data, error } = await client
            .from('userProfiles')
            .select('ReadingDiagnosticCompleted')
            .eq('id', user.id)
            .single();

        if(data.ReadingDiagnosticCompleted === false){
            const { data, error } = await client
                .from('userProfiles')
                .update({ ReadingDiagnosticCompleted: true })
                .eq('id', user.id)
        }

        if (data.MathDiagnosticCompleted === false) {
            const { data, error } = await client
                .from('userProfiles')
                .update({MathDiagnosticCompleted: true })
                .eq('id', user.id)
        }

        container.innerHTML = `
            <div class="question-box">
                <h3>Practice Complete!</h3>
                <h2>Questions Correct: ${questionCorrect}</h2>
                <h2>Questions Incorrect: ${questionIncorrect}</h2>
                <button id = "backToDashboard">Back</button>
            </div>
        `;

        document.getElementById('backToDashboard').addEventListener('click', () => {
            changeSection(dashboardSection);
        });
        
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
                isCorrect: isCorrectBoolean,
                subject: q.subject
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

async function fetchDashboardInformation(){
    const { data: { user } } = await client.auth.getUser();

    const { data: profileData , error: profileError } = await client
        .from('userProfiles')
        .select('ReadingDiagnosticCompleted, MathDiagnosticCompleted')
        .eq('id', user.id)
        .single();

    if(profileError){
        console.error("User diagnostic status could not be fetched!");
    }

    if(profileData.ReadingDiagnosticCompleted === false){
        const readingPracticeDescription = document.getElementById('readingPracticeDescription');
        readingPracticeDescription.innerHTML = "Start your diagnostic!";
    }

    if(profileData.MathDiagnosticCompleted === false){
        const mathPracticeDescription = document.getElementById('mathPracticeDescription');
        mathPracticeDescription.innerHTML = "Start your diagnostic!";
    }

    //Fetch all questions that the user has answered
    const { data , error } = await client
        .from('userResponses')
        .select('subject, questionDomain, questionSkill, timeElapsed, isCorrect')
        .eq('id', user.id);

    if(error){
        console.error("Error fetching user responses: ", error);
        return;
    }

    const questionMap = {
        English: {},
        Mathematics: {}
    };

    for(const item of data){
        const questionDomainName = item.questionDomain;
        const questionSubject = item.subject;
        
        if(!questionMap[questionSubject][questionDomainName]){
            questionMap[questionSubject][questionDomainName] = {
                domainName: questionDomainName,
                totalQuestions: 0,
                correctCount: 0,
                totalTimeElapsed: 0
            };
        }

        const questionGroup = questionMap[questionSubject][questionDomainName];
        questionGroup.totalQuestions += 1;
        questionGroup.correctCount += item.isCorrect ? 1 : 0;
        questionGroup.totalTimeElapsed += item.timeElapsed;
    }

    const userStatistics = { English: [], Mathematics: [] };  
    for(const questionSubject in questionMap){
        for(const questionDomain in questionMap[questionSubject]){
            const questionGroup = questionMap[questionSubject][questionDomain];
        
            questionGroup.domainName = (questionGroup.domainName);
            questionGroup.domainAccuracy = Math.round((questionGroup.correctCount / questionGroup.totalQuestions) * 100);
            questionGroup.domainAverageTimeElapsed = Math.round(questionGroup.totalTimeElapsed / questionGroup.totalQuestions);

            userStatistics[questionSubject].push(questionGroup);
        }

        userStatistics[questionSubject].sort((a, b) => a.domainAccuracy - b.domainAccuracy);
    }

    return userStatistics;
}

//Basic walkthrough explanation of the adaptive algorithm process
//1. Pull all question responses from the current user (check)
//2. If the diagnostic questions have been completed, you have to cross reference from the user responses 
//to what questions that have been fetched. 
//How do we decide what questions to fetch? Decide based on the statistics (their accuracy), however we also have to fetch other questions
//so the student doesn't only have to do one domain of questions. 

async function adaptiveAlgorithm(databaseName) {
    const userStatistics = await fetchDashboardInformation();
    const { data: { user } } = await client.auth.getUser();

    //Fetch all questions that the user have completed
    const { data } = await client
        .from('userResponses')
        .select('questionID')
        .eq('id', user.id);
    
    //Create a map to store the questionIDs
    const answeredIds = [];

    if (data) {
        for(const item of data){
            answeredIds.push(item.questionID);
        }
    }

    let databaseToQuery = '';

    if(databaseName == "English"){
        databaseToQuery = "AllReadingQuestions";
    } else {
        databaseToQuery = "AllMathQuestions";
    }

    const sortedDomainAccuracy = userStatistics[databaseName];
    const topThreeWeakDomains = sortedDomainAccuracy.slice(0,3);

    let sessionQuestions = [];

    for(const questionDomainName of topThreeWeakDomains){
        let query = client
            .from(databaseToQuery)
            .select('*')
            .eq('questionDomain', questionDomainName.domainName)
            .limit(3);
        

        if(answeredIds.length > 0){
            query = query.not('questionID', 'in', `(${answeredIds.join(',')})`);
        }

        const { data, error } = await query;

        if(data && data.length > 0){
            sessionQuestions.push(...data);
        }
    }

    //Fill the rest with random questions
    if(sessionQuestions.length < 15){
        let questionsNeeded = 15 - sessionQuestions.length;

        let query = client 
            .from(databaseToQuery)
            .select('*')
            .limit(questionsNeeded);
        
        if(answeredIds.length > 0){
            query = query.not('questionID', 'in', `(${answeredIds.join(',')})`);
        }

        const { data, error } = await query;

        if(data && data.length > 0){
            sessionQuestions.push(...data);
        }
    }

    console.log(sessionQuestions);
    return sessionQuestions;
}