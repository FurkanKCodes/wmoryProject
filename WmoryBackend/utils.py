from db import get_db_connection

def log_action(actor_id, action_type, target_id=None, metadata=None):
    """
    Inserts a record into the audit_logs table.
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        sql = """
            INSERT INTO audit_logs (actor_id, action_type, target_id, metadata)
            VALUES (%s, %s, %s, %s)
        """
        cursor.execute(sql, (actor_id, action_type, target_id, metadata))
        
        conn.commit()
        cursor.close()
        conn.close()
    except Exception as e:
        # We assume logging errors shouldn't crash the main app flow
        print(f"[AUDIT LOG ERROR]: {e}")