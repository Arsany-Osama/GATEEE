import { useEffect, useMemo, useState } from 'react';
import { createQuiz, getDashboardData } from '../../api/adminApi';
import { getAdminCourseCurriculum } from '../../api/adminCourseContentApi';
import { getApiError } from '../../api/client';
import Button from '../../components/Button';
import EmptyState from '../../components/EmptyState';
import ErrorMessage from '../../components/ErrorMessage';
import Input from '../../components/Input';
import Loader from '../../components/Loader';
import PageBackLink from '../../components/PageBackLink';

const emptyQuestion = () => ({
  question_text: '',
  options: [
    { option_text: '', is_correct: true },
    { option_text: '', is_correct: false },
  ],
});

const emptyQuizForm = () => ({ lesson_id: '', title: '', questions: [emptyQuestion()] });

const QuizBuilderPage = () => {
  const [courses, setCourses] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [form, setForm] = useState(emptyQuizForm());
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [loadingLessons, setLoadingLessons] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    const loadCourses = async () => {
      setLoadingCourses(true);
      try {
        const data = await getDashboardData();
        if (active) setCourses(Array.isArray(data?.courses) ? data.courses : []);
      } catch (err) {
        if (active) setError(getApiError(err, 'Could not load courses.'));
      } finally {
        if (active) setLoadingCourses(false);
      }
    };
    loadCourses();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    const loadLessons = async () => {
      setPlaylists([]);
      setForm(emptyQuizForm());
      if (!selectedCourseId) return;
      setLoadingLessons(true);
      setError('');
      try {
        const data = await getAdminCourseCurriculum(selectedCourseId);
        if (active) setPlaylists(Array.isArray(data?.playlists) ? data.playlists : []);
      } catch (err) {
        if (active) setError(getApiError(err, 'Could not load lessons for this course.'));
      } finally {
        if (active) setLoadingLessons(false);
      }
    };
    loadLessons();
    return () => {
      active = false;
    };
  }, [selectedCourseId]);

  const lessons = useMemo(() => playlists.flatMap((playlist) => (
    Array.isArray(playlist.lessons)
      ? playlist.lessons.map((lesson) => ({ ...lesson, playlistTitle: playlist.title }))
      : []
  )), [playlists]);

  const updateQuestion = (index, next) => {
    const questions = [...form.questions];
    questions[index] = { ...questions[index], ...next };
    setForm({ ...form, questions });
  };

  const updateOption = (questionIndex, optionIndex, next) => {
    const questions = [...form.questions];
    const options = [...questions[questionIndex].options];
    options[optionIndex] = { ...options[optionIndex], ...next };
    questions[questionIndex] = { ...questions[questionIndex], options };
    setForm({ ...form, questions });
  };

  const setCorrect = (questionIndex, optionIndex) => {
    const questions = [...form.questions];
    questions[questionIndex].options = questions[questionIndex].options.map((option, index) => ({ ...option, is_correct: index === optionIndex }));
    setForm({ ...form, questions });
  };

  const validate = () => {
    if (!form.lesson_id) return 'Select a real lesson for this quiz.';
    if (!form.title.trim()) return 'Quiz title is required.';
    if (!form.questions.length) return 'At least one question is required.';
    for (const question of form.questions) {
      if (!question.question_text.trim()) return 'Every question needs text.';
      if (question.options.length < 2) return 'Every question needs at least two options.';
      if (question.options.some((option) => !option.option_text.trim())) return 'Every option needs text.';
      if (question.options.filter((option) => option.is_correct).length !== 1) return 'Every question needs exactly one correct answer.';
    }
    return '';
  };

  const submit = async (event) => {
    event.preventDefault();
    const validation = validate();
    if (validation) return setError(validation);
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await createQuiz({ lesson_id: Number(form.lesson_id), title: form.title.trim(), questions: form.questions });
      setMessage('Quiz created successfully.');
      setForm(emptyQuizForm());
    } catch (err) {
      setError(getApiError(err, 'Could not create quiz.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="admin-page">
      <div className="admin-page-toolbar"><PageBackLink to="/admin">Back to Admin Dashboard</PageBackLink></div>
      <section className="page-head">
        <div>
          <p className="eyebrow">Assessment</p>
          <h1>Quiz Builder</h1>
          <p>Create lesson quizzes with one correct answer per question using real course lessons.</p>
        </div>
      </section>

      <ErrorMessage message={error} />
      {message ? <div className="notice notice-success">{message}</div> : null}
      {loadingCourses ? <Loader label="Loading courses..." /> : null}

      {!loadingCourses && courses.length === 0 ? <EmptyState title="No courses available" message="Create a course and lessons before building a quiz." /> : null}

      {!loadingCourses && courses.length > 0 ? (
        <form className="quiz-builder" onSubmit={submit}>
          <section className="panel form-grid">
            <label className="field">
              <span>Course</span>
              <select value={selectedCourseId} onChange={(e) => setSelectedCourseId(e.target.value)} required>
                <option value="">Select course</option>
                {courses.map((course) => <option key={course.id} value={course.id}>{course.title || course.id}</option>)}
              </select>
            </label>
            <label className="field">
              <span>Lesson</span>
              <select value={form.lesson_id} onChange={(e) => setForm({ ...emptyQuizForm(), lesson_id: e.target.value })} disabled={!selectedCourseId || loadingLessons} required>
                <option value="">{loadingLessons ? 'Loading lessons...' : 'Select lesson'}</option>
                {lessons.map((lesson) => {
                  const hidden = lesson.is_published === false || lesson.is_published === 0;
                  return <option key={lesson.id} value={lesson.id}>{lesson.playlistTitle} - {lesson.title}{hidden ? ' (hidden)' : ''}</option>;
                })}
              </select>
            </label>
            <Input label="Quiz title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          </section>

          {selectedCourseId && !loadingLessons && lessons.length === 0 ? <EmptyState title="No lessons in this course" message="Add lessons in the Course Editor before creating a quiz." /> : null}

          {form.questions.map((question, questionIndex) => (
            <section className="question-card" key={questionIndex}>
              <div className="split-row">
                <h2>Question {questionIndex + 1}</h2>
                <Button variant="ghost" disabled={form.questions.length === 1} onClick={() => setForm({ ...form, questions: form.questions.filter((_, index) => index !== questionIndex) })}>Remove</Button>
              </div>
              <Input label="Question text" value={question.question_text} onChange={(e) => updateQuestion(questionIndex, { question_text: e.target.value })} required />
              {question.options.map((option, optionIndex) => (
                <div className="option-builder" key={optionIndex}>
                  <input type="radio" name={`correct-${questionIndex}`} checked={option.is_correct} onChange={() => setCorrect(questionIndex, optionIndex)} />
                  <Input label={`Option ${optionIndex + 1}`} value={option.option_text} onChange={(e) => updateOption(questionIndex, optionIndex, { option_text: e.target.value })} required />
                  <Button variant="ghost" disabled={question.options.length <= 2} onClick={() => updateQuestion(questionIndex, { options: question.options.filter((_, index) => index !== optionIndex) })}>Remove</Button>
                </div>
              ))}
              <Button variant="secondary" onClick={() => updateQuestion(questionIndex, { options: [...question.options, { option_text: '', is_correct: false }] })}>Add Option</Button>
            </section>
          ))}
          <div className="form-actions">
            <Button variant="secondary" onClick={() => setForm({ ...form, questions: [...form.questions, emptyQuestion()] })}>Add Question</Button>
            <Button type="submit" disabled={saving || !form.lesson_id}>{saving ? 'Creating...' : 'Create Quiz'}</Button>
          </div>
        </form>
      ) : null}
    </main>
  );
};

export default QuizBuilderPage;
