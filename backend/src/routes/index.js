const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');

const authCtrl      = require('../controllers/authController');
const userCtrl      = require('../controllers/userController');
const courseCtrl    = require('../controllers/courseController');
const quizCtrl      = require('../controllers/quizController');
const payCtrl       = require('../controllers/paymentController');
const { updateProgressWithCert } = require('../controllers/progressController');
const {
  getLeaderboard, getMyProfile, getBadges,
  getSOPs, getSOP, createSOP, updateSOP,
  getKPIs, createKPI, addKPIEntry, getKPIScorecard,
  getLeads, createLead, updateLead,
} = require('../controllers/otherControllers');
const {
  getLiveClasses, createLiveClass, markAttendance,
  createModule, updateModule, deleteModule,
  createLesson, updateLesson, deleteLesson,
  getCertificates, issueCertificate, verifyCertificate,
} = require('../controllers/extendedControllers');

// ── AUTH ──────────────────────────────────────────────────────────────────────
router.post('/auth/send-otp',  authCtrl.sendOTP);
router.post('/auth/verify-otp', authCtrl.verifyOTP);
router.post('/auth/login',     authCtrl.loginWithEmail);
router.post('/auth/refresh',   authCtrl.refreshToken);
router.post('/auth/logout',    authCtrl.logout);

// ── USERS ─────────────────────────────────────────────────────────────────────
router.get('/users',     authenticate, requireRole('super_admin','org_admin','manager'), userCtrl.getUsers);
router.get('/users/:id', authenticate, userCtrl.getUser);
router.post('/users',    authenticate, requireRole('super_admin','org_admin'), userCtrl.createUser);
router.put('/users/:id', authenticate, requireRole('super_admin','org_admin'), userCtrl.updateUser);
router.delete('/users/:id', authenticate, requireRole('super_admin','org_admin'), userCtrl.deleteUser);

// ── ADMIN ─────────────────────────────────────────────────────────────────────
router.get('/admin/dashboard', authenticate, requireRole('super_admin','org_admin','manager'), userCtrl.getAdminDashboard);
router.get('/admin/orgs',      authenticate, requireRole('super_admin'), userCtrl.getOrganizations);
router.post('/admin/orgs',     authenticate, requireRole('super_admin'), userCtrl.createOrganization);

// ── COURSES ───────────────────────────────────────────────────────────────────
router.get('/courses',       authenticate, courseCtrl.getCourses);
router.get('/courses/:id',   authenticate, courseCtrl.getCourse);
router.post('/courses',      authenticate, requireRole('super_admin','org_admin','trainer'), courseCtrl.createCourse);
router.put('/courses/:id',   authenticate, requireRole('super_admin','org_admin','trainer'), courseCtrl.updateCourse);
router.delete('/courses/:id',authenticate, requireRole('super_admin','org_admin'), courseCtrl.deleteCourse);
router.post('/courses/:id/enroll',   authenticate, courseCtrl.enrollCourse);
router.post('/courses/:id/progress', authenticate, updateProgressWithCert);

// ── MODULES & LESSONS ─────────────────────────────────────────────────────────
router.post('/modules',      authenticate, requireRole('super_admin','org_admin','trainer'), createModule);
router.put('/modules/:id',   authenticate, requireRole('super_admin','org_admin','trainer'), updateModule);
router.delete('/modules/:id',authenticate, requireRole('super_admin','org_admin','trainer'), deleteModule);
router.post('/lessons',      authenticate, requireRole('super_admin','org_admin','trainer'), createLesson);
router.put('/lessons/:id',   authenticate, requireRole('super_admin','org_admin','trainer'), updateLesson);
router.delete('/lessons/:id',authenticate, requireRole('super_admin','org_admin','trainer'), deleteLesson);

// ── QUIZZES ───────────────────────────────────────────────────────────────────
router.get('/quizzes',              authenticate, quizCtrl.getQuizzes);
router.get('/quizzes/:id',          authenticate, quizCtrl.getQuiz);
router.post('/quizzes',             authenticate, requireRole('super_admin','org_admin','trainer'), quizCtrl.createQuiz);
router.put('/quizzes/:id',          authenticate, requireRole('super_admin','org_admin','trainer'), quizCtrl.updateQuiz);
router.patch('/quizzes/:id/publish',authenticate, requireRole('super_admin','org_admin','trainer'), quizCtrl.publishQuiz);
router.post('/quizzes/:id/submit',  authenticate, quizCtrl.submitQuiz);
router.get('/quizzes/:id/results',  authenticate, requireRole('super_admin','org_admin','trainer','manager'), quizCtrl.getQuizResults);

// ── LIVE CLASSES ──────────────────────────────────────────────────────────────
router.get('/live-classes',           authenticate, getLiveClasses);
router.post('/live-classes',          authenticate, requireRole('super_admin','org_admin','trainer'), createLiveClass);
router.post('/live-classes/:id/attend', authenticate, markAttendance);

// ── GAMIFICATION ──────────────────────────────────────────────────────────────
router.get('/gamification/leaderboard', authenticate, getLeaderboard);
router.get('/gamification/profile',     authenticate, getMyProfile);
router.get('/gamification/badges',      authenticate, getBadges);

// ── SOPs ──────────────────────────────────────────────────────────────────────
router.get('/sops',      authenticate, getSOPs);
router.get('/sops/:id',  authenticate, getSOP);
router.post('/sops',     authenticate, requireRole('super_admin','org_admin','trainer'), createSOP);
router.put('/sops/:id',  authenticate, requireRole('super_admin','org_admin','trainer'), updateSOP);

// ── KPI ───────────────────────────────────────────────────────────────────────
router.get('/kpis',                   authenticate, getKPIs);
router.post('/kpis',                  authenticate, requireRole('super_admin','org_admin'), createKPI);
router.post('/kpis/entries',          authenticate, requireRole('super_admin','org_admin','manager'), addKPIEntry);
router.get('/kpis/scorecard/:user_id',authenticate, getKPIScorecard);

// ── SUBSCRIPTIONS & PAYMENTS ──────────────────────────────────────────────────
router.get('/plans',                    payCtrl.getPlans);
router.get('/subscriptions/current',    authenticate, payCtrl.getCurrentSubscription);
router.get('/payments/history',         authenticate, payCtrl.getPaymentHistory);
router.post('/subscriptions/order',     authenticate, payCtrl.createOrder);
router.post('/subscriptions/verify',    authenticate, payCtrl.verifyPayment);

// ── CERTIFICATES ──────────────────────────────────────────────────────────────
router.get('/certificates',                  authenticate, getCertificates);
router.post('/certificates/issue',           authenticate, requireRole('super_admin','org_admin'), issueCertificate);
router.get('/certificates/verify/:number',   verifyCertificate);

// ── CRM ───────────────────────────────────────────────────────────────────────
router.get('/crm/leads',      authenticate, requireRole('super_admin','org_admin','manager'), getLeads);
router.post('/crm/leads',     authenticate, requireRole('super_admin','org_admin','manager'), createLead);
router.put('/crm/leads/:id',  authenticate, requireRole('super_admin','org_admin','manager'), updateLead);

module.exports = router;

// ── AI ROUTES ─────────────────────────────────────────────────────────────────
const aiCtrl = require('../controllers/aiController');
router.get('/ai/status',                    authenticate, aiCtrl.getAIStatus);
router.post('/ai/generate-course',          authenticate, requireRole('super_admin','org_admin','trainer'), aiCtrl.generateCourse);
router.post('/ai/generate-quiz',            authenticate, requireRole('super_admin','org_admin','trainer'), aiCtrl.generateQuiz);
router.post('/ai/generate-certificate-text',authenticate, aiCtrl.generateCertificateText);
router.post('/ai/improve-content',          authenticate, requireRole('super_admin','org_admin','trainer'), aiCtrl.improveContent);
router.post('/ai/chat',                     authenticate, aiCtrl.chat);

// ── CMS ROUTES ────────────────────────────────────────────────────────────────
const cmsCtrl = require('../controllers/cmsController');
router.get('/cms/settings',          authenticate, cmsCtrl.getSettings);
router.put('/cms/settings',          authenticate, requireRole('super_admin','org_admin'), cmsCtrl.updateSettings);
router.get('/cms/fields',            authenticate, cmsCtrl.getCustomFields);
router.post('/cms/fields',           authenticate, requireRole('super_admin','org_admin'), cmsCtrl.createCustomField);
router.put('/cms/fields/:id',        authenticate, requireRole('super_admin','org_admin'), cmsCtrl.updateCustomField);
router.delete('/cms/fields/:id',     authenticate, requireRole('super_admin','org_admin'), cmsCtrl.deleteCustomField);
router.get('/cms/field-values',      authenticate, cmsCtrl.getFieldValues);
router.post('/cms/field-values',     authenticate, cmsCtrl.saveFieldValues);
router.get('/cms/menu',              authenticate, cmsCtrl.getMenuConfig);
router.post('/cms/menu',             authenticate, requireRole('super_admin','org_admin'), cmsCtrl.saveMenuConfig);
router.post('/cms/badges',           authenticate, requireRole('super_admin','org_admin'), require('../controllers/gamificationController').createBadge);
router.post('/cms/challenges',       authenticate, requireRole('super_admin','org_admin'), require('../controllers/gamificationController').createChallenge);
router.post('/cms/rewards',          authenticate, requireRole('super_admin','org_admin'), require('../controllers/gamificationController').createReward);

// ── ENHANCED GAMIFICATION ROUTES ──────────────────────────────────────────────
const gamCtrl = require('../controllers/gamificationController');
router.get('/gamification/dashboard',           authenticate, gamCtrl.getGamificationDashboard);
router.get('/gamification/challenges',          authenticate, gamCtrl.getChallenges);
router.post('/gamification/challenges/:id/join',authenticate, gamCtrl.joinChallenge);
router.get('/gamification/rewards',             authenticate, gamCtrl.getRewards);
router.post('/gamification/rewards/:id/redeem', authenticate, gamCtrl.redeemReward);
router.post('/gamification/award-points',       authenticate, requireRole('super_admin','org_admin','manager'), gamCtrl.awardPoints);
