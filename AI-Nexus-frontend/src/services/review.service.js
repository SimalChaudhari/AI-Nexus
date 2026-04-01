import axios from 'src/utils/axios';

/**
 * Fetch reviews for a course (isCourse: true, courseId = courseId).
 * Use for computing average rating and count from the reviews table.
 */
export async function getCourseReviews(courseId) {
  const { data } = await axios.get('/reviews', { params: { courseId } });
  const list = data?.data ?? data ?? [];
  return Array.isArray(list) ? list : [];
}

/**
 * Fetch reviews for a speaker (isSpeaker: true, speakerId = speakerId).
 */
export async function getSpeakerReviews(speakerId) {
  const { data } = await axios.get('/reviews', { params: { speakerId } });
  const list = data?.data ?? data ?? [];
  return Array.isArray(list) ? list : [];
}

/**
 * Create a course review (isCourse: true).
 * @param {{ userId: string, courseId: string, rating: number, feedback?: string }} payload
 */
export async function createCourseReview({ userId, courseId, rating, feedback }) {
  const { data } = await axios.post('/reviews', {
    userId,
    courseId,
    isCourse: true,
    isSpeaker: false,
    rating: Number(rating),
    feedback: feedback || undefined,
  });
  return data;
}

/**
 * Create a speaker review (isSpeaker: true).
 * When submitted from course feedback, pass courseId so the review is linked to that course.
 * Storing courseId ensures that when the course is deleted we only set courseId to null.
 * @param {{ userId: string, speakerId: string, rating: number, feedback?: string, courseId?: string | null }} payload
 */
export async function createSpeakerReview({ userId, speakerId, rating, feedback, courseId }) {
  const { data } = await axios.post('/reviews', {
    userId,
    speakerId,
    isSpeaker: true,
    isCourse: false,
    rating: Number(rating),
    feedback: feedback || undefined,
    courseId: courseId ?? null,
  });
  return data;
}

/**
 * Delete a review by id. Use for admin.
 */
export async function deleteReview(reviewId) {
  await axios.delete(`/reviews/${reviewId}`);
}
