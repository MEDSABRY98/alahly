import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Trophy, 
  Target,
  BarChart3,
  Users,
  Calendar,
  TrendingUp,
  ArrowLeft
} from 'lucide-react';
import './AhlyVsZamalek.css';

const AhlyVsZamalekPage = () => {

  return (
    <div className="ahly-vs-zamalek-container">
      <div className="page-header">
        <Link to="/" className="back-button">
          <ArrowLeft className="back-icon" />
          <span>رجوع للصفحة الرئيسية</span>
        </Link>
        <h1>Ahly VS Zamalek</h1>
      </div>

      <div className="coming-soon">
        <h2>قريباً</h2>
        <p>سيتم إضافة المحتوى قريباً</p>
      </div>

    </div>
  );
};

export default AhlyVsZamalekPage;
