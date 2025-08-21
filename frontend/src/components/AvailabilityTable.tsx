import React, { useEffect, useState } from 'react';
import { availabilityApi } from '../services/api';
import { AvailabilityResponse } from '../types/availability';
import './AvailabilityTable.css';

const AvailabilityTable: React.FC = () => {
  const [data, setData] = useState<AvailabilityResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const targetDate = '2025-11-15';

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await availabilityApi.getAvailability(targetDate);
        setData(response);
        setError(null);
      } catch (err) {
        setError('データの取得に失敗しました');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const getStatusSymbol = (status: string) => {
    switch (status) {
      case 'available':
        return '○';
      case 'booked':
        return '×';
      case 'lottery':
        return '△';
      default:
        return '?';
    }
  };

  const formatUpdateTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('ja-JP', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '不明';
    }
  };

  if (loading) {
    return (
      <div className="availability-container">
        <div className="loading">データを読み込み中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="availability-container">
        <div className="error">{error}</div>
      </div>
    );
  }

  if (!data || !data.facilities || data.facilities.length === 0) {
    return (
      <div className="availability-container">
        <div className="no-data">データがありません</div>
      </div>
    );
  }

  return (
    <div className="availability-container">
      <h1>空きスタサーチくん</h1>
      <h2>施設空き状況 - {targetDate}</h2>
      
      <div className="table-wrapper">
        <table className="availability-table">
          <thead>
            <tr>
              <th className="facility-name">施設名</th>
              <th className="time-slot">13:00-17:00</th>
              <th className="update-time">更新日時</th>
            </tr>
          </thead>
          <tbody>
            {data.facilities.map((facility, index) => (
              <tr key={index}>
                <td className="facility-name">{facility.facilityName}</td>
                <td className="time-slot">
                  <span className={`status status-${facility.timeSlots['13-17']}`}>
                    {getStatusSymbol(facility.timeSlots['13-17'])}
                  </span>
                </td>
                <td className="update-time">{formatUpdateTime(facility.lastUpdated)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="legend">
        <span className="legend-item">
          <span className="status status-available">○</span> 空き
        </span>
        <span className="legend-item">
          <span className="status status-booked">×</span> 予約済み
        </span>
      </div>
      
    </div>
  );
};

export default AvailabilityTable;