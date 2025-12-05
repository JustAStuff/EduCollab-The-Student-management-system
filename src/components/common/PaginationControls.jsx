// src/components/common/PaginationControls.jsx - Reusable pagination controls
import PropTypes from 'prop-types';
import {
  Box,
  Pagination,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material';

const PaginationControls = ({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  showItemsPerPage = true,
  itemsPerPageOptions = [5, 10, 25, 50],
  showItemCount = true,
  size = 'medium'
}) => {
  const startIndex = (currentPage - 1) * itemsPerPage + 1;
  const endIndex = Math.min(currentPage * itemsPerPage, totalItems);

  if (totalItems === 0) {
    return null;
  }

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 2,
        mt: 2,
        p: 2
      }}
    >
      {/* Items count and per-page selector */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        {showItemCount && (
          <Typography variant="body2" color="text.secondary">
            Showing {startIndex}-{endIndex} of {totalItems} items
          </Typography>
        )}
        
        {showItemsPerPage && onItemsPerPageChange && (
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Items per page</InputLabel>
            <Select
              value={itemsPerPage}
              label="Items per page"
              onChange={(e) => onItemsPerPageChange(e.target.value)}
            >
              {itemsPerPageOptions.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
      </Box>

      {/* Pagination controls */}
      {totalPages > 1 && (
        <Pagination
          count={totalPages}
          page={currentPage}
          onChange={(event, page) => onPageChange(page)}
          size={size}
          showFirstButton
          showLastButton
          color="primary"
        />
      )}
    </Box>
  );
};

PaginationControls.propTypes = {
  currentPage: PropTypes.number.isRequired,
  totalPages: PropTypes.number.isRequired,
  totalItems: PropTypes.number.isRequired,
  itemsPerPage: PropTypes.number.isRequired,
  onPageChange: PropTypes.func.isRequired,
  onItemsPerPageChange: PropTypes.func,
  showItemsPerPage: PropTypes.bool,
  itemsPerPageOptions: PropTypes.arrayOf(PropTypes.number),
  showItemCount: PropTypes.bool,
  size: PropTypes.oneOf(['small', 'medium', 'large'])
};

export default PaginationControls;