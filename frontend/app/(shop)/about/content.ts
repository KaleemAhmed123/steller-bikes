// THE ABOUT PAGE TEXT — supplied by the client, used word for word. Do not edit, shorten,
// re-order or "improve" it. Layout and styling live in page.tsx and about.css; pictures are
// managed in Admin → Platform → Shop info → About images.

export const ABOUT = {
  title: 'About Us - Stellar Bicycle',

  story: {
    heading: 'Our Story',
    lede: 'From 1991...',
    paragraphs: [
      'Welcome to Stellar Bicycle at New Midland Cycle Store. We started our business in 1991 based on providing quality, honest and customer focused service.',
      'We have been providing our service to a variety of people for over 35 years. We have worked hard to earn customers trust by providing quality, reliable and customer focused service. With love, blessings and support from our customers we have grown our business day by day, month by month and year by year. We have provided for over 60,000 customers.',
    ],
  },

  matters: {
    heading: 'Why Bicycles Matter',
    paragraphs: [
      'A bicycle can mean everything to people. Many people need a bicycle to get to work, school, go on errands, help with their livelihood and keep active.',
      'A bicycle can provide freedom, ease, fitness and joy to people of all ages. This has always driven us to improve.',
      'Throughout the years we have listened to our customers and learnt from their experiences. We have taken the time to really understand what they need, what their budget is, what they like and what they expect from a great bicycle. We have learnt that a great bicycle should provide comfort, reliability, safety and value.',
    ],
  },

  brand: {
    heading: 'Stellar Bicycle',
    paragraphs: [
      'After years of experience, research and understanding our customers we created Stellar Bicycle. To provide affordable, comfortable, stylish and reliable bicycles.',
      'Stellar Bicycle was created using our knowledge gained since 1991 and the trust we have received from our customers. Every element of our brand has been created with the intention of getting more people cycling.',
      'Our goal is to provide a range of bicycles for children, students, families, commuters and cycling enthusiasts. We want everyone to enjoy a comfortable ride, keep active, go on easy journeys and create happy memories.',
      'Stellar Bicycle has been created using our experience, customer needs, dedication to quality and the love and trust we have received.',
    ],
  },

  guarantee: {
    heading: 'Lifetime Frame Guarantee',
    lead: 'We want to earn your trust and keep it.',
    paragraphs: [
      'We offer a Lifetime Frame Guarantee on all our models (Terms & Conditions apply). This shows our commitment to providing quality frames.',
      'If the joint of your frame breaks due to a manufacturing fault and not due to an accident or damage then we will replace your frame free of charge. (Terms & Conditions apply). Customers will only be responsible for paying labour charges.',
      'We want to give our customers confidence by taking responsibility, providing reliable support and keeping our promises.',
      'This is one way we show our commitment to our customers.',
    ],
  },

  why: {
    heading: 'Why Choose Us?',
    items: [
      { title: 'Established in 1991.', text: 'We have been in the bicycle industry for over 3 decades.' },
      { title: 'Served 60,000+ customers.', text: 'We have a growing community of customers based on trust, love and customer satisfaction.' },
      { title: 'Affordable.', text: 'We want to provide bicycles to everyone with value.' },
      { title: 'Comfortable.', text: 'We want to provide comfortable bicycles.' },
      { title: 'Stylish.', text: 'We have stylish colours and designs for all ages.' },
      { title: 'Electric & Non-Electric.', text: 'We have a range for all lifestyles.' },
      { title: 'Lifetime Frame Guarantee.', text: 'We want to give you extra confidence with our frame guarantee (Terms & Conditions Apply).' },
      { title: 'Customer Focused.', text: 'We value our customers and want to create lasting relationships.' },
      { title: 'Healthier Lifestyle.', text: 'We want to encourage people to keep active.' },
      { title: 'Green Future.', text: 'We want to encourage an eco-friendly way of travelling.' },
    ],
  },

  mission: {
    heading: 'Our Mission',
    paragraphs: [
      'To provide affordable quality cycling for everyone. We want to provide comfortable, reliable, stylish and value bicycles to help with people everyday journeys and help them live a healthier lifestyle.',
    ],
  },

  vision: {
    heading: 'Our Vision',
    paragraphs: [
      'To make Stellar Bicycle a well known and trusted brand within the bicycle industry. We will continue to understand our customers, improve our products, innovate and keep our promises.',
      'We aim to create a brand that can be trusted by future generations, just like New Midland Cycle Store has been trusted by generations of customers since 1991.',
    ],
  },

  promise: {
    heading: 'Our Promise',
    paragraphs: [
      'Our journey started with a commitment to quality and continues with the trust we have from our customers. All our bicycles show our commitment to providing value, comfort and reliable service.',
      'The love and blessings we have had throughout the years has inspired us to keep moving forward, improving our work and helping more people with honesty and care.',
      'We believe a brand can really become special when the customers become part of the story.',
    ],
  },

  // "35+ Years of Trust. 60,000+ Customers. One Commitment to Quality." — shown as three phrases.
  closing: {
    highlights: ['35+ Years of Trust.', '60,000+ Customers.', 'One Commitment to Quality.'],
    lines: [
      'Stellar Bicycle - New Midland Cycle Store',
      'Experience. Everyday. Trusted.',
      'Stellar Bicycle. Ride with Confidence. Ride with Comfort. Ride with Stellar.',
    ],
  },

  terms: {
    heading: 'Lifetime Frame Guarantee - Terms & Conditions',
    items: [
      {
        title: '1. Manufacturing Faults',
        text: 'If the joint of your frame breaks due to a manufacturing fault and not due to an accident, impact, misuse or damage then we will replace your frame free of charge.',
      },
      { title: '2. Fitting Charges', text: 'Customers will only be responsible for paying labour charges.' },
      { title: '3. Inspection', text: 'You will need to bring your bicycle to an authorised service point for inspection.' },
      {
        title: '4. Exclusions',
        text: 'Damage caused by accidents, collisions, over loading, incorrect use, unauthorised changes or general wear and tear.',
      },
      { title: '5. Proof of Purchase', text: 'Customers need to provide proof of purchase such as the original invoice.' },
      { title: '6. Guarantee', text: 'This guarantee is only for the frame of your bicycle.' },
    ],
    note: 'This guarantee is subject to terms and conditions. Please keep your invoice.',
    signoff: 'Stellar Bicycle. Your Journey. Our Commitment.',
  },
} as const;
