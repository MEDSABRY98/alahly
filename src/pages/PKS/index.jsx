import React from 'react';
import { Routes, Route } from 'react-router-dom';
import PKSMain from './PKSMain';
import PKSStatistics from './PKSStatistics';
import PKSTakers from './PKSTakers';
import PKSHistory from './PKSHistory';
import PKSGK from './PKSGK';

const PKSPage = () => {
  return (
    <Routes>
      <Route path="/" element={<PKSMain />} />
      <Route path="/statistics" element={<PKSStatistics />} />
      <Route path="/takers" element={<PKSTakers />} />
      <Route path="/history" element={<PKSHistory />} />
      <Route path="/gk" element={<PKSGK />} />
    </Routes>
  );
};

export default PKSPage;
