import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Trophy, 
  Target,
  Calendar,
  BarChart3,
  Users,
  Award,
  TrendingUp,
  ArrowLeft
} from 'lucide-react';
import './Finals.css';

const FinalsPage = () => {


  return (
    <div className="finals-container">
      <div className="page-header">
        <Link to="/" className="back-button">
          <ArrowLeft className="back-icon" />
          <span>رجوع للصفحة الرئيسية</span>
        </Link>
        <h1>FINALS</h1>
      </div>

      <div className="coming-soon">
        <h2>قريباً</h2>
        <p>سيتم إضافة المحتوى قريباً</p>
      </div>


    </div>
  );
};

export default FinalsPage;
