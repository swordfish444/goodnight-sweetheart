const MESSAGE_LIBRARY = [
  'I hope you have a lovely night. Sleep well and wake up smiling.',
  'You made it through the day. Goodnight sweetheart, and rest easy.',
  'Tonight is for peace, comfort, and gratitude. Sleep well.',
  'You are deeply loved. Goodnight sweetheart, and have a beautiful night.',
  'Let the day go. You have earned a soft, restful night.',
  'May your mind feel calm and your heart feel full tonight.',
  'I hope you drift off feeling safe, appreciated, and at peace.',
  'Goodnight sweetheart. May your dreams be gentle and your sleep be deep.',
  'Take this moment to breathe, be grateful, and settle into rest.',
  'You are enough for today. Now let yourself rest.',
  'The day is done. I hope tonight feels warm, easy, and kind.',
  'Wrap yourself in gratitude and let sleep do the rest.',
  'I hope your night is cozy, calm, and full of sweet dreams.',
  'You are cherished. Goodnight sweetheart, and sleep well.',
  'May tonight bring you comfort, stillness, and a happy heart.',
  'Rest now. Tomorrow can wait until morning.',
  'I hope your heart feels light and your body feels ready for sleep.',
  'You deserve tenderness, peace, and deep rest tonight.',
  'Let this be your reminder that you are loved. Goodnight sweetheart.',
  'Close the day with gratitude and let yourself fully rest.',
];

function randomMessage(random = Math.random) {
  const index = Math.floor(random() * MESSAGE_LIBRARY.length);
  return MESSAGE_LIBRARY[index];
}

module.exports = {
  MESSAGE_LIBRARY,
  randomMessage,
};

