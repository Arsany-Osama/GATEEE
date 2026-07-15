const LessonSidebar = ({ playlists = [], selectedLessonId, completedLessons = [], onSelectLesson }) => (
  <aside className="lesson-sidebar">
    {playlists.length === 0 ? (
      <p className="muted">No curriculum has been added yet.</p>
    ) : (
      playlists.map((playlist) => (
        <section key={playlist.id} className="lesson-group">
          <h3>{playlist.title || 'Untitled playlist'}</h3>
          {(playlist.lessons || []).map((lesson) => {
            const isComplete = completedLessons.includes(lesson.id);
            const isActive = selectedLessonId === lesson.id;
            return (
              <button
                className={`lesson-row ${isActive ? 'active' : ''} ${isComplete ? 'complete' : ''}`}
                key={lesson.id}
                type="button"
                onClick={() => onSelectLesson(lesson)}
              >
                <span className="lesson-number">{lesson.order_index || ''}</span>
                <span>{lesson.title || 'Untitled lesson'}</span>
                {isComplete ? <strong>Done</strong> : null}
              </button>
            );
          })}
        </section>
      ))
    )}
  </aside>
);

export default LessonSidebar;
