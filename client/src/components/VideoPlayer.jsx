import { memo, useEffect, useMemo, useRef, useState } from 'react';
import ErrorMessage from './ErrorMessage';
import Loader from './Loader';

const watermarkSpots = [
  { top: '8%', left: '6%' },
  { top: '14%', right: '8%' },
  { top: '38%', left: '12%' },
  { top: '46%', right: '10%' },
  { bottom: '18%', left: '10%' },
  { bottom: '12%', right: '8%' },
];

const randomWatermarkStyle = () => {
  const spot = watermarkSpots[Math.floor(Math.random() * watermarkSpots.length)];
  const opacity = (0.2 + Math.random() * 0.15).toFixed(2);
  return { ...spot, opacity };
};

const formatStamp = (value) => value.toLocaleString();

const VideoPlayer = ({ src, currentUser, lessonTitle, onWatchProgress }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [watermarkStyle, setWatermarkStyle] = useState(() => randomWatermarkStyle());
  const [stamp, setStamp] = useState(() => formatStamp(new Date()));
  const videoRef = useRef(null);
  const lastReportedSecondRef = useRef(0);

  const watermarkLines = useMemo(() => ([
    currentUser?.name || 'Student',
    currentUser?.email || 'No email',
    stamp,
  ]), [currentUser?.email, currentUser?.name, stamp]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setWatermarkStyle(randomWatermarkStyle());
      setStamp(formatStamp(new Date()));
    }, 10000);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!src || typeof onWatchProgress !== 'function') return undefined;
    const video = videoRef.current;
    if (!video) return undefined;

    const flushProgress = () => {
      const watchedSeconds = Math.floor(video.currentTime || 0);
      const durationSeconds = Math.floor(video.duration || 0);
      if (!durationSeconds || watchedSeconds <= 0) return;
      if (watchedSeconds <= lastReportedSecondRef.current) return;
      lastReportedSecondRef.current = watchedSeconds;
      onWatchProgress({ watched_seconds: watchedSeconds, duration_seconds: durationSeconds });
    };

    const interval = window.setInterval(() => {
      if (!video.paused && !video.ended) flushProgress();
    }, 10000);

    video.addEventListener('pause', flushProgress);
    video.addEventListener('ended', flushProgress);
    video.addEventListener('seeking', flushProgress);

    return () => {
      window.clearInterval(interval);
      video.removeEventListener('pause', flushProgress);
      video.removeEventListener('ended', flushProgress);
      video.removeEventListener('seeking', flushProgress);
    };
  }, [onWatchProgress, src]);

  if (!src) return <div className="video-placeholder"><ErrorMessage message="Video URL is not available for this lesson." /></div>;

  return (
    <div className="video-shell">
      {loading ? <Loader label="Loading video..." /> : null}
      {error ? <ErrorMessage message={error} /> : null}
      <video
        ref={videoRef}
        key={src}
        className="video-player"
        src={src}
        title={lessonTitle}
        controls
        controlsList="nodownload"
        onContextMenu={(event) => event.preventDefault()}
        onCanPlay={() => setLoading(false)}
        onError={() => {
          setLoading(false);
          setError('Could not load this video. Please try again later.');
        }}
      />
      <div className="video-watermark" style={watermarkStyle} aria-hidden="true">
        {watermarkLines.map((line) => <span key={line}>{line}</span>)}
      </div>
    </div>
  );
};

export default memo(VideoPlayer);
