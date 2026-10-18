package repository

import (
	"context"
	"time"

	"github.com/mediago-dev/mediago-drama/services/server/internal/domain"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// ListAppSettingsByPrefix reads ordered, non-secret definitions.
func (repo *AppSettingRepository) ListAppSettingsByPrefix(ctx context.Context, prefix string) ([]string, error) {
	var records []domain.AppSettingModel
	if err := repo.db.WithContext(ctx).Where("setting_key LIKE ?", prefix+"%").Order("setting_key").Find(&records).Error; err != nil {
		return nil, err
	}
	values := make([]string, 0, len(records))
	for _, record := range records {
		values = append(values, record.Value)
	}
	return values, nil
}

// CompareAndSwapAppSettingWithKey atomically writes a definition and optional credential.
// nil previous creates; nil next deletes; nil credential preserves the stored key.
func (repo *AppSettingRepository) CompareAndSwapAppSettingWithKey(ctx context.Context, key string, previous, next *string, keyName string, credential *string) error {
	return repo.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if previous == nil {
			result := tx.Clauses(clause.OnConflict{DoNothing: true}).Create(&domain.AppSettingModel{Key: key, Value: *next, UpdatedAt: time.Now().UTC()})
			if result.Error != nil {
				return result.Error
			}
			if result.RowsAffected != 1 {
				return domain.ErrSettingsRevisionConflict
			}
		} else {
			query := tx.Where("setting_key = ? AND setting_value = ?", key, *previous)
			var result *gorm.DB
			if next == nil {
				result = query.Delete(&domain.AppSettingModel{})
			} else {
				result = query.Model(&domain.AppSettingModel{}).Updates(map[string]interface{}{"setting_value": *next, "updated_at": time.Now().UTC()})
			}
			if result.Error != nil {
				return result.Error
			}
			if result.RowsAffected != 1 {
				return domain.ErrSettingsRevisionConflict
			}
		}
		if next == nil || (credential != nil && *credential == "") {
			return tx.Where("key_name = ?", keyName).Delete(&domain.APIKeyModel{}).Error
		}
		if credential != nil {
			return tx.Clauses(clause.OnConflict{Columns: []clause.Column{{Name: "key_name"}}, DoUpdates: clause.AssignmentColumns([]string{"api_key", "updated_at"})}).Create(&domain.APIKeyModel{KeyName: keyName, APIKey: *credential, UpdatedAt: time.Now().UTC()}).Error
		}
		return nil
	})
}
