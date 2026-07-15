import { memo } from 'react';
import { Link } from 'react-router-dom';
import Badge from './Badge';
import ProgressBar from './ProgressBar';

const CourseCard = memo(({ course, progress }) => (
  <article className="course-card">
    <div className="course-thumb">
      <span>{(course?.title || 'G').slice(0, 1).toUpperCase()}</span>
    </div>
    <div>
      <Badge>Enrolled</Badge>
      <h3>{course?.title || 'Untitled course'}</h3>
      <p>{course?.description || 'No description provided.'}</p>
    </div>
    <ProgressBar value={progress?.progress_percentage ?? 0} />
    <Link className="btn btn-primary" to={`/player/${course?.id}`}>Continue Course</Link>
  </article>
));

export default CourseCard;
