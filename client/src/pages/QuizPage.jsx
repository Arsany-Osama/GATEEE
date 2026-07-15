import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getApiError } from '../api/client';
import { getLessonQuiz, submitQuiz } from '../api/quizApi';
import Button from '../components/Button';
import EmptyState from '../components/EmptyState';
import ErrorMessage from '../components/ErrorMessage';
import Loader from '../components/Loader';
import PageBackLink from '../components/PageBackLink';

const QuizPage = () => {
  const { lessonId } = useParams();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await getLessonQuiz(lessonId);
        if (active) setQuiz(data);
      } catch (err) {
        if (active) {
          setQuiz(null);
          setError(err?.response?.status === 404 ? '' : getApiError(err, 'Could not load this quiz.'));
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [lessonId]);

  const questions = useMemo(() => (Array.isArray(quiz?.questions) ? quiz.questions : []), [quiz]);
  const ready = useMemo(() => questions.length > 0 && questions.every((question) => answers[question.id]), [answers, questions]);

  const submit = async (event) => {
    event.preventDefault();
    if (!ready) return;
    setSubmitting(true);
    setError('');
    try {
      const payload = questions.map((question) => ({ question_id: question.id, option_id: answers[question.id] }));
      setResult(await submitQuiz(quiz.quiz_id, payload));
    } catch (err) {
      setError(getApiError(err, 'Could not submit your quiz.'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Loader fullScreen label="Loading quiz..." />;

  const percentage = result?.total ? Math.round((Number(result.score) / Number(result.total)) * 100) : 0;

  return (
    <main className="page narrow-page quiz-page">
      <div className="student-page-toolbar">
        <PageBackLink to="/dashboard">Back to Dashboard</PageBackLink>
      </div>
      <section className="page-head">
        <div>
          <p className="eyebrow">Lesson quiz</p>
          <h1>{quiz?.title || 'Quiz'}</h1>
        </div>
        <Button variant="ghost" onClick={() => navigate(-1)}>Back</Button>
      </section>
      <ErrorMessage message={error} />
      {!quiz ? <EmptyState title="No quiz available for this lesson." message="Return to the lesson and continue the course." /> : null}
      {quiz ? (
        <form className="quiz-form" onSubmit={submit}>
          {questions.map((question, index) => (
            <fieldset className="question-card" key={question.id}>
              <legend>{index + 1}. {question.question_text}</legend>
              {(question.options || []).map((option) => (
                <label className="radio-row" key={option.id}>
                  <input
                    type="radio"
                    name={`question-${question.id}`}
                    value={option.id}
                    checked={answers[question.id] === option.id}
                    onChange={() => setAnswers({ ...answers, [question.id]: option.id })}
                  />
                  <span>{option.option_text}</span>
                </label>
              ))}
            </fieldset>
          ))}
          <Button type="submit" disabled={!ready || submitting}>{submitting ? 'Submitting...' : 'Submit Quiz'}</Button>
        </form>
      ) : null}
      {result ? (
        <section className={`result-card ${percentage >= 50 ? 'success' : 'danger'}`}>
          <h2>{result.score} / {result.total}</h2>
          <p>{percentage}%</p>
          <span>{result.message}</span>
        </section>
      ) : null}
    </main>
  );
};

export default QuizPage;
