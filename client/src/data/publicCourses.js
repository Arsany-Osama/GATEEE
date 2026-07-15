export const publicCourses = [
  {
    id: 1,
    title: 'OSHA Standards for General Industry and Construction',
    arabic_title: 'كورس معايير الأوشا للصناعات العامة والإنشاءات',
    description: 'Comprehensive training on industrial safety principles, risk assessment, and control measures.',
    instructor_name: 'Eng. Ahmed Gamal Elghawy',
    instructor_subtitle: '10+ Years Experience',
    price: 2000,
    paymentPath: '/payment/course/1',
    thumbnail_url: '/images/osha-course-cover.png',
    image: '/images/osha-course-cover.png',
  },
  {
    id: 2,
    title: 'IOSH Managing Safely course',
    arabic_title: 'كورس الأيوش الإدارة بأمان',
    description: 'Essential safety practices for construction sites and project environments.',
    instructor_name: 'Eng. Ahmed Gamal Elghawy',
    instructor_subtitle: '10+ Years Experience',
    price: 2000,
    paymentPath: '/payment/course/2',
    thumbnail_url: '/images/iosh-course-cover.png',
    image: '/images/iosh-course-cover.png',
  },
];

export const getPublicCourseById = (id) => publicCourses.find((course) => String(course.id) === String(id));
